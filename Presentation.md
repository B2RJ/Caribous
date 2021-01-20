# Présentation

## Présentation du sujet

La réalisation de notre projet est disponible [ici](https://b2rj.github.io/Caribous/src/slide.html).

Nous avons à notre disposition des [données](https://www.kaggle.com/jessemostipak/caribou-location-tracking) sur des populations de Caribou en Colombie-Britannique, une province Canadienne. Ces données commencent en 1988 et finissent en 2016. Elles comportent diverses informations comme la géolocalisation régulière des individus ou leur lieu de pose de la balise GPS. Sur certaines périodes nous possédons également des informations à propos des gestations ou de la présence ou non de bébés avec leur mère.

Nous avons également en notre possession un jeu de [données](https://www.kaggle.com/berkeleyearth/climate-change-earth-surface-temperature-data?select=GlobalLandTemperaturesByCountry.csv) sur les températures moyennes mensuelles en Colombie Britannique entre 1743 et 2013.

## Navigateurs recommandés

* Chrome
* Chromium
* Edge
* Firefox (peut avoir des ralentissements)

## Traitement des données

Afin d'afficher aisément les données nous avons réalisé pour chaque visualisation une étape de pré-traitement en Python. Cette étape nous a permis de générer des fichiers au format csv très simple à manipuler et afficher à l'aide de D3.js. Dans certain cas, une étape supplémentaire a été effectué en D3.js. C'est le cas pour les données météorologiques où un filtre a été appliqué et sur les affichages des trajectoires où les calculs de moyennes ont été effectué en JavaScript. Nous avons pris le parti de séparer le traitement en deux étapes afin de limiter le nombre de fichier au format csv. Ainsi nous n'avons pas un fichier pour un unique cas et nous limitons le nombre de fichiers chargés.

## Sources techniques 

### D3.js

Pour l'initiation à D3.js nous avons utilisé ce [cours](https://lyondataviz.github.io/teaching/lyon1-m2/2020/intro_d3/) d'Aurélien [TABARD](https://www.tabard.fr).
Pour la représentation en barchart nous nous sommes inspiré de ce [tutoriel](https://www.datavis.fr/index.php?page=stacked-barchart) d'[Eric Frigot](https://twitter.com/eric_frigot).
Pour la représentation de la température nous nous sommes inspiré de ce [tutoriel](https://blocks.lsecities.net/d3noob/b6a31090595da11536a6d30d63198c1e) disponible sur [https://blocks.lsecities.net/](https://blocks.lsecities.net/).

### Synthèse vocale

Pour la synthèse vocale, nous avons utilisé Web Speech API et nous nous sommes inspiré de ce [tutoriel](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) mis à disposition par [Mozilla](https://developer.mozilla.org/en-US/).

## A propos de nous

### Qui sommes-nous ?

Nous sommes quatre étudiants du Master 2 Intelligence Artificielle.

### Contact

Nous sommes disponible par mail:

* Thomas BOFFY : thomas.boffy@etu.univ-lyon1.fr
* Richard BRUNEAU : richard.bruneau@etu.univ-lyon1.fr
* William CHAZOT : william.chazot@etu.univ-lyon1.fr
* Pierre VASLIN : pierre.vaslin@etu.univ-lyon1.fr
