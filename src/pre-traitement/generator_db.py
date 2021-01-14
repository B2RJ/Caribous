""" This file is use to generate the CSV files """

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

EXEC_FROM_ROOT = True
if EXEC_FROM_ROOT:
    PREFIX_GET = "./data/original_data/"
    PREFIX_SET = "./data/ourdata/"
else:
    PREFIX_GET = "../../data/original_data"
    PREFIX_SET = "../../ourdata/"

INDIVIDUALS = pd.read_csv(PREFIX_GET + "individuals.csv")
LOCATIONS = pd.read_csv(PREFIX_GET + "locations.csv")
TEMPERATURES = pd.read_csv(PREFIX_GET + "GlobalLandTemperaturesByState.csv")


def export_data_for_trajectory():
    """ Export data use for the trajectory visualization """
    LOCATIONS["date"] = pd.to_datetime(LOCATIONS["timestamp"]).dt.strftime("%Y-%m-%d")
    trajectory_data = LOCATIONS.loc[:, ["date", "study_site",
                                        "longitude", "latitude"]].sort_values(by=["date"])

    study_sites = trajectory_data["study_site"].drop_duplicates().to_list()
    final_data = list(map(lambda x: trajectory_data.loc[(trajectory_data["study_site"] == x)],
                          study_sites))
    for i, dataframe in enumerate(final_data):
        dataframe.to_csv(PREFIX_SET + "trajectory_by_site/" +
                         study_sites[i].replace(" ", "_").lower() + ".csv", index=False)


def export_data_for_temperature():
    """ Export data use for the temperature visualization"""
    # Selectionne uniquement les données en colombie britannique
    data_canada = TEMPERATURES.loc[
        (TEMPERATURES["State"].str.contains("British Columbia", regex=True)) &
        (TEMPERATURES["AverageTemperature"].isnull() != True)]

    # Ajout de la colonne season
    winter_list = []
    winter_list.append(data_canada["dt"].loc[
        (data_canada["dt"].str.contains("-01-")) |
        (data_canada["dt"].str.contains("-02-")) |
        (data_canada["dt"].str.contains("-03-")) |
        (data_canada["dt"].str.contains("-11-")) |
        (data_canada["dt"].str.contains("-12-"))])
    winter_list = pd.DataFrame(winter_list)
    winter_list = winter_list.T
    winter_list["Winter"] = "Winter"

    data_canada = data_canada.assign(Winter=lambda x: winter_list["Winter"])
    data_canada["Season"] = data_canada["Winter"].astype(
        str).replace("nan", "Summer", regex=True)
    data_canada = data_canada.drop(["Winter"], axis=1)

    data_canada = average_temperature_season(data_canada)

    # Export
    data_canada.to_csv(PREFIX_SET + "british_columbia_temperatures.csv",
                       float_format="%.3f", index=False)


def fix_year(element):
    """It's use for the winter year"""
    if element.month == "11" or element.month == "12":
        element.year = pd.to_numeric(element.year)-1


def average_temperature_season(data_canada: pd.DataFrame) -> pd.DataFrame:
    " Compute the average temperature for each season "
    # 1. Get year in an other dataframe
    year_month = data_canada.filter(items=["dt"])
    year_month = year_month["dt"].str.partition("-")
    year_month = year_month.rename(columns={0: "year"})
    year_month["month"] = year_month[2].str.partition("-")[0]
    # Delete useless column
    year_month = year_month.drop(columns=2)
    year_month = year_month.drop(columns=1)

    # 2. Change year for november and december
    year_month.apply(fix_year, axis="columns")

    # 3. Add "Season_Year" column in dataCanada
    data_canada["Season_Year"] = data_canada["Season"] + \
        "-" + year_month["year"].astype(str)

    # 4. Average
    season_average = pd.DataFrame()
    # Gives the average for 368 seasons
    season_average["Average"] = data_canada.groupby(
        ["Season_Year"])["AverageTemperature"].mean()

    # Save SeasonAverage as file ? Add column Season for D3
    season_average["Season_Year"] = season_average.index

    # Invert column
    season_average = season_average.iloc[:, ::-1]

    # Delete the year from the Season_Year column
    season_average[["Season", "Year"]] = season_average["Season_Year"].str.split(
        "-", 1, expand=True)

    # Export file
    season_average.to_csv(PREFIX_SET + "SeasonAverage.csv",
                          float_format="%.3f", index=False)

    data_canada = data_canada.drop(columns="Season_Year")
    return data_canada


def contains_and_replace(dataframe, column, replaces):
    """ replace element in a dataframe """
    for i in range(len(replaces)):
        dataframe.loc[dataframe[column].str.contains(replaces[i][0], case=False) == replaces[i][1], column] = replaces[i][2]


def export_data_death():
    """ Export information on the death """
    # On selectionne uniquement les caribous morts
    # ET dont la cause de mort est précisée (une cause de mort inconnue reste valide)
    death_data = INDIVIDUALS.loc[(INDIVIDUALS["deploy_off_type"].str.contains("dead")) & (INDIVIDUALS["death_cause"].isnull() == False)]
    death_data = death_data.loc[:, ["animal_id", "death_cause", "deploy_off_longitude", "deploy_off_latitude"]]

    # On selectionne les caribous en fonction de leur dernière position connue
    last_locations = LOCATIONS[LOCATIONS.groupby("animal_id")["timestamp"].transform("max") == LOCATIONS["timestamp"]]

    # On fusionne les deux tables
    all_death_info = pd.merge(last_locations, death_data, on="animal_id")

    # On remplace les coordonnées vides par la dernière position connue associée (à ce niveau, plus aucun NaN)
    all_death_info["deploy_off_longitude"] = np.where(all_death_info["deploy_off_longitude"].isnull(), all_death_info["longitude"], all_death_info["deploy_off_longitude"])
    all_death_info["deploy_off_latitude"] = np.where(all_death_info["deploy_off_latitude"].isnull(), all_death_info["latitude"], all_death_info["deploy_off_latitude"])

    all_death_info = all_death_info.loc[:, ["animal_id", "timestamp", "death_cause", "deploy_off_longitude", "deploy_off_latitude"]]
    all_death_info = all_death_info.rename(columns={"timestamp": "last_known_timestamp"})

    # On utilise des informations de mort plus concrètes pour avoir des couleurs
    contains_and_replace(
        all_death_info,
        "death_cause",
        [
            ["collision", True, "Vehicle Collision"],
            ["predation", True, "Predation"],
            ["Collision|Predation", False, "Other"]
        ]
    )

    # On clusterise les caribous en fonction de la distance qui les sépare
    # (DBSCAN pour la distance min)
    db_scan = DBSCAN(eps=0.3, min_samples=1).fit(all_death_info.loc[:, [
        "deploy_off_longitude", "deploy_off_latitude"]])
    all_death_info["cluster"] = db_scan.labels_

    all_death_info.to_csv(PREFIX_SET + "death_reasons.csv", index=False)


def export_death_cause_stats():
    """ Generates the file for causes of death. Use the file generate by export_Data_Death
    """
    # Load file export by exportDataDeath
    data_death_reasons = pd.read_csv(PREFIX_SET + "death_reasons.csv")

    #Select the correct column
    data_death_reasons = data_death_reasons.loc[:, ["animal_id", "last_known_timestamp", "death_cause"]]

    # Keep only the year
    data_death_reasons["last_known_timestamp"] = (data_death_reasons["last_known_timestamp"].
                                                  str.split("-", 1, expand=True))

    # Change order
    data_death_reasons = data_death_reasons[["last_known_timestamp", "death_cause"]]

    # Sort by year, study_site, death_cause -> better to imagine the DataFrame
    data_death_reasons = data_death_reasons.sort_values(
        by=["last_known_timestamp", "death_cause"])

    # Creation DataFrame with the number of each kind of death for each year
    data_death_reasons = data_death_reasons.groupby(["last_known_timestamp", "death_cause"])["last_known_timestamp"].count().unstack(fill_value=0)

    data_death_reasons.to_csv(PREFIX_SET + "death_cause_stats.csv", index=True)


def export_data_pregnant():
    """ Generate the file for the repartition of the pregnant
    """
    # Selects pregnant caribou
    data_pregnant = INDIVIDUALS.loc[(INDIVIDUALS["pregnant"] == True), ["animal_id", "study_site"]]

    # Use to date caribou
    data_locations = LOCATIONS.loc[:, ["animal_id",
                                       "timestamp"]].sort_values(by="timestamp")

    # Keep only the first time we track the caribou
    data_locations = data_locations.drop_duplicates(subset="animal_id",
                                                    keep="first")

    # Keep only the year
    data_locations["timestamp"] = data_locations["timestamp"].str.split("-", 1, expand=True)

    # Concat dataframes
    data_pregnant = pd.merge(data_locations, data_pregnant, on="animal_id")

    # Creation DataFrame with the number of pregnant for each year and for each study_site
    data_pregnant = data_pregnant.groupby(["timestamp",
                                           "study_site"])["timestamp"].count().unstack(fill_value=0)

    # Export file
    data_pregnant.to_csv(PREFIX_SET + "pregnant_count.csv", index=True)


def export_data_mean_by_year():
    """ Return the average position by year """
    LOCATIONS["year"] = pd.to_datetime(
        LOCATIONS['timestamp']).dt.strftime('%Y')
    selection = ["longitude", "latitude", "year", "study_site", "animal_id"]
    resultat = LOCATIONS.loc[:, selection].groupby(["year", "animal_id", "study_site"]).mean()
    resultat.to_csv(PREFIX_SET + "location_means_years.csv")


if __name__ == "__main__":
    export_data_for_trajectory()
    export_data_for_temperature()
    export_data_death()
    export_death_cause_stats()
    export_data_pregnant()
    export_data_mean_by_year()
