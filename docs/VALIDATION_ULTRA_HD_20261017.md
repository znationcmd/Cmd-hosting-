# Validation Ultra HD — 17 octobre 2026

Workflow GitHub Actions 39021604780 : SUCCESS.

32 parcours supplémentaires dans Chromium : 8 pages sur chacun des profils 3840×2160, 7680×4320, 15360×8640 (DPR 1) et 3840×2160 (DPR 4, soit 15360×8640 pixels physiques). Contrôles de navigation, absence de débordement horizontal, présence des SVG, absence de chevauchement de sidebar et largeur de contenu bornée. Les 48 parcours mobile/tablette/PC existants passent également. Captures recadrées à 1800×1000 pour revue ; les mesures portent sur les viewports complets.

Limites : simulation navigateur, pas un écran 16K physique. Les API sont simulées non connectées et les images externes bloquées dans les tests. Cela valide la mise en page et la présence des éléments vectoriels, pas la qualité des jaquettes ni les opérations métier.

Audit source : le logo web/public/brand-logo.webp mesure 144×144 pixels. Les jaquettes de la boutique sont des images raster externes. Aucun agrandissement artificiel ni revendication d'assets natifs 16K. Un original SVG du logo et des sources haute résolution des jaquettes sont nécessaires pour améliorer leur définition réelle. Aucun changement supplémentaire en production lors de cette passe : elle vérifie le thème déjà publié.
