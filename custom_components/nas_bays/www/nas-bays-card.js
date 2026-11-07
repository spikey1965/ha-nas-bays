/* NAS Bays card for Home Assistant. Read-only: nothing on this card can change the NAS. MIT licence. */
(() => {
const VERSION = "0.4.1";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const fmt = (v, d = 1) => (v == null ? "–" : (+v).toFixed(d));
const decSize = (b) => { if (!b) return ""; const t = b / 1e12; return t >= 1 ? `${Math.round(t)} TB` : `${Math.round(b / 1e9)} GB`; };
const binSize = (b) => (b == null ? "–" : b >= 2 ** 40 ? `${(b / 2 ** 40).toFixed(1)} TiB` : `${(b / 2 ** 30).toFixed(0)} GiB`);
/* Text in 8 languages. The source is archive/tools/i18n_strings.py. */
const T = {"en":{"up_d":"up {d}d {h}h","up_h":"up {h}h {m}m","min_ago":"{n} min ago","h_ago":"{n} h ago","days_ago":"{n} days ago","no_data":"No data","no_data_for":"No data for {n} min","connected":"Connected","not_connected":"Not connected","connecting":"Connecting","running":"Running","stopped":"Stopped","not_found":"Not found","no_issues":"No issues","issue_failing":"Health check failing","issue_stopped":"Container stopped","issue_starting":"Starting","issue_nocheck":"No health check","backups":"Backups","no_snap_tasks":"No snapshot tasks","snap_failed":{"one":"{n} snapshot task failed","other":"{n} snapshot tasks failed"},"no_snaps_yet":"No snapshots yet","last_snapshot":"Last snapshot {when}","snapshots_n":{"one":"{n} snapshot","other":"{n} snapshots"},"remote_failed":{"one":"{n} off-pool backup failed","other":"{n} off-pool backups failed"},"no_remote":"No replication, cloud or rsync task","last_remote":"Last off-pool backup {when}","remote_not_run":"Off-pool backup not run yet","scrub_running":"Scrub running","scrubbed":"Scrubbed {d}","never_scrubbed":"Never scrubbed","disks_errors":"{e} of {n} disks with errors","scrub_errors":{"one":"{n} scrub error","other":"{n} scrub errors"},"free":"{s} free","pct_full":"{p} {n} percent full","unknown":"Unknown","empty":"Empty","gone":"Gone","missing":"Missing","missing_l":"missing","drive_aria":"{s}, {t} degrees, {h}","healthy_w":"healthy","attention_w":"needs attention","internal":"Internal","boot":"boot","none":"none","bays":"Bays","not_placed":"Not placed in a bay yet","tap_drive":"Tap a drive for its details.","no_data_nas":"No data from the NAS.","not_reporting":"The NAS isn't reporting this drive. It may have been removed or failed.","not_in_pool":"not in a pool","healthy_errors":"Healthy. {r} read, {w} write and {c} checksum errors.","healthy_nopool":"Healthy. No alerts. Not in a pool.","problem":"Problem","state_errors":"{s}: {r} read, {w} write and {c} checksum errors.","nothing_since":"Nothing received since {t}","waiting":"Waiting for the NAS","x_of_y":"{a} of {b}","apps_running":"apps running","alerts":{"one":"alert","other":"alerts"},"all_good":"All good","disks_attention":{"one":"{n} disk needs attention","other":"{n} disks need attention"},"alerts_n":{"one":"{n} alert","other":"{n} alerts"},"unhealthy":"unhealthy","cpu_aria":"CPU {n} percent","load":"load {n}","memory":"Memory","network":"Network","storage":"Storage","mem_aria":"Of {t} GiB: {a} apps and system, {c} ZFS cache, {f} free","mem_line":"{c} cache · {f} free of {t} GiB","up":"up","down":"down","link_down":"{n}: link down","drives_aria":{"one":"{n} drive","other":"{n} drives"},"apps_memory":"Apps memory","pool_full":"{p} full","pool":"Pool","add_integration":"Add the <b>NAS Bays for TrueNAS</b> integration first: Settings → Devices &amp; services → Add integration.","e_size":"Size","e_full":"Full","e_compact":"Compact","e_colours":"Colours","e_follow":"Follow Home Assistant","e_darktext":"Dark text","e_whitetext":"White text","e_language":"Language","e_lang_auto":"Follow Home Assistant","e_show":"Show on the card","e_vpn_line":"VPN line","e_backups_line":"Backups line","e_fill":"Fill the height of the screen (not on phones)","e_maxw":"Maximum width in pixels (0 fills the whole space)","e_vpn_opt":"VPN line (optional)","e_vpn_help":"Pick any sensor that says whether your VPN is connected. Leave it empty to hide the line. The Gluetun helper script in the README sets this up for you.","e_vpn_sensor":"VPN sensor","e_label":"Label (optional)","e_custom":"This card uses a custom case layout, set in its YAML.","e_bays_legend":"Drive bays","e_bays_help":"Drives fill the bays automatically. TrueNAS can't tell which physical bay a drive is in, so to match your case, pick the drive for each bay using the serial on its label.","e_bays_n":"Number of bays","e_bay":"Bay {n}","e_auto":"Automatic","e_no_pool":"no pool","e_auto_btn":"Back to automatic order"},
"de":{"up_d":"läuft seit {d} T {h} Std.","up_h":"läuft seit {h} Std. {m} Min.","min_ago":"vor {n} Min.","h_ago":"vor {n} Std.","days_ago":"vor {n} Tagen","no_data":"Keine Daten","no_data_for":"Seit {n} Min. keine Daten","connected":"Verbunden","not_connected":"Nicht verbunden","connecting":"Verbindet","running":"Läuft","stopped":"Gestoppt","not_found":"Nicht gefunden","no_issues":"Keine Probleme","issue_failing":"Statusprüfung fehlgeschlagen","issue_stopped":"Container gestoppt","issue_starting":"Startet","issue_nocheck":"Keine Statusprüfung","backups":"Backups","no_snap_tasks":"Keine Snapshot-Aufgaben","snap_failed":{"one":"{n} Snapshot-Aufgabe fehlgeschlagen","other":"{n} Snapshot-Aufgaben fehlgeschlagen"},"no_snaps_yet":"Noch keine Snapshots","last_snapshot":"Letzter Snapshot {when}","snapshots_n":{"one":"{n} Snapshot","other":"{n} Snapshots"},"remote_failed":{"one":"{n} externes Backup fehlgeschlagen","other":"{n} externe Backups fehlgeschlagen"},"no_remote":"Keine Replikations-, Cloud- oder Rsync-Aufgabe","last_remote":"Letztes externes Backup {when}","remote_not_run":"Externes Backup noch nicht gelaufen","scrub_running":"Scrub läuft","scrubbed":"Scrub am {d}","never_scrubbed":"Noch kein Scrub","disks_errors":"{e} von {n} Laufwerken mit Fehlern","scrub_errors":{"one":"{n} Scrub-Fehler","other":"{n} Scrub-Fehler"},"free":"{s} frei","pct_full":"{p} zu {n} Prozent voll","unknown":"Unbekannt","empty":"Leer","gone":"Weg","missing":"Fehlt","missing_l":"fehlt","drive_aria":"{s}, {t} Grad, {h}","healthy_w":"in Ordnung","attention_w":"braucht Aufmerksamkeit","internal":"Intern","boot":"Boot","none":"keiner","bays":"Schächte","not_placed":"Noch keinem Schacht zugeordnet","tap_drive":"Tippe auf ein Laufwerk für Details.","no_data_nas":"Keine Daten vom NAS.","not_reporting":"Das NAS meldet dieses Laufwerk nicht. Es wurde vielleicht entfernt oder ist ausgefallen.","not_in_pool":"in keinem Pool","healthy_errors":"In Ordnung. {r} Lese-, {w} Schreib- und {c} Prüfsummenfehler.","healthy_nopool":"In Ordnung. Keine Warnungen. In keinem Pool.","problem":"Problem","state_errors":"{s}: {r} Lese-, {w} Schreib- und {c} Prüfsummenfehler.","nothing_since":"Nichts empfangen seit {t}","waiting":"Warte auf das NAS","x_of_y":"{a} von {b}","apps_running":"Apps laufen","alerts":{"one":"Warnung","other":"Warnungen"},"all_good":"Alles gut","disks_attention":{"one":"{n} Laufwerk braucht Aufmerksamkeit","other":"{n} Laufwerke brauchen Aufmerksamkeit"},"alerts_n":{"one":"{n} Warnung","other":"{n} Warnungen"},"unhealthy":"fehlerhaft","cpu_aria":"CPU {n} Prozent","load":"Last {n}","memory":"Arbeitsspeicher","network":"Netzwerk","storage":"Speicher","mem_aria":"Von {t} GiB: {a} Apps und System, {c} ZFS-Cache, {f} frei","mem_line":"{c} Cache · {f} frei von {t} GiB","up":"hoch","down":"runter","link_down":"{n}: keine Verbindung","drives_aria":{"one":"{n} Laufwerk","other":"{n} Laufwerke"},"apps_memory":"Speicher für Apps","pool_full":"{p} belegt","pool":"Pool","add_integration":"Füge zuerst die Integration <b>NAS Bays for TrueNAS</b> hinzu: Einstellungen → Geräte &amp; Dienste → Integration hinzufügen.","e_size":"Größe","e_full":"Voll","e_compact":"Kompakt","e_colours":"Farben","e_follow":"Wie Home Assistant","e_darktext":"Dunkler Text","e_whitetext":"Weißer Text","e_language":"Sprache","e_lang_auto":"Wie Home Assistant","e_show":"Auf der Karte anzeigen","e_vpn_line":"VPN-Zeile","e_backups_line":"Backup-Zeile","e_fill":"Volle Bildschirmhöhe nutzen (nicht auf Handys)","e_maxw":"Maximale Breite in Pixeln (0 nutzt den ganzen Platz)","e_vpn_opt":"VPN-Zeile (optional)","e_vpn_help":"Wähle einen Sensor, der anzeigt, ob dein VPN verbunden ist. Lass das Feld leer, um die Zeile auszublenden. Das Gluetun-Hilfsskript in der README richtet das für dich ein.","e_vpn_sensor":"VPN-Sensor","e_label":"Bezeichnung (optional)","e_custom":"Diese Karte nutzt ein eigenes Gehäuse-Layout, das im YAML festgelegt ist.","e_bays_legend":"Laufwerksschächte","e_bays_help":"Laufwerke füllen die Schächte automatisch. TrueNAS erkennt nicht, in welchem Schacht ein Laufwerk steckt. Wähle deshalb für jeden Schacht das Laufwerk anhand der Seriennummer auf dem Etikett aus, damit es zu deinem Gehäuse passt.","e_bays_n":"Anzahl der Schächte","e_bay":"Schacht {n}","e_auto":"Automatisch","e_no_pool":"kein Pool","e_auto_btn":"Zurück zur automatischen Reihenfolge"},
"fr":{"up_d":"actif depuis {d} j {h} h","up_h":"actif depuis {h} h {m} min","min_ago":"il y a {n} min","h_ago":"il y a {n} h","days_ago":"il y a {n} jours","no_data":"Aucune donnée","no_data_for":"Aucune donnée depuis {n} min","connected":"Connecté","not_connected":"Non connecté","connecting":"Connexion","running":"Actif","stopped":"Arrêté","not_found":"Introuvable","no_issues":"Aucun problème","issue_failing":"Contrôle de santé en échec","issue_stopped":"Conteneur arrêté","issue_starting":"Démarrage","issue_nocheck":"Pas de contrôle de santé","backups":"Sauvegardes","no_snap_tasks":"Aucune tâche d'instantané","snap_failed":{"one":"{n} tâche d'instantané en échec","other":"{n} tâches d'instantané en échec"},"no_snaps_yet":"Pas encore d'instantané","last_snapshot":"Dernier instantané {when}","snapshots_n":{"one":"{n} instantané","other":"{n} instantanés"},"remote_failed":{"one":"{n} sauvegarde externe en échec","other":"{n} sauvegardes externes en échec"},"no_remote":"Aucune tâche de réplication, cloud ou rsync","last_remote":"Dernière sauvegarde externe {when}","remote_not_run":"Sauvegarde externe pas encore lancée","scrub_running":"Scrub en cours","scrubbed":"Scrub le {d}","never_scrubbed":"Jamais de scrub","disks_errors":"{e} disques sur {n} avec erreurs","scrub_errors":{"one":"{n} erreur de scrub","other":"{n} erreurs de scrub"},"free":"{s} libres","pct_full":"{p} rempli à {n} pour cent","unknown":"Inconnu","empty":"Vide","gone":"Absent","missing":"Manquant","missing_l":"manquant","drive_aria":"{s}, {t} degrés, {h}","healthy_w":"en bon état","attention_w":"à vérifier","internal":"Interne","boot":"boot","none":"aucun","bays":"Baies","not_placed":"Pas encore placé dans une baie","tap_drive":"Touchez un disque pour voir ses détails.","no_data_nas":"Aucune donnée du NAS.","not_reporting":"Le NAS ne signale pas ce disque. Il a peut-être été retiré ou est en panne.","not_in_pool":"hors pool","healthy_errors":"En bon état. {r} erreurs de lecture, {w} d'écriture et {c} de somme de contrôle.","healthy_nopool":"En bon état. Aucune alerte. Hors pool.","problem":"Problème","state_errors":"{s} : {r} erreurs de lecture, {w} d'écriture et {c} de somme de contrôle.","nothing_since":"Rien reçu depuis {t}","waiting":"En attente du NAS","x_of_y":"{a} sur {b}","apps_running":"applis actives","alerts":{"one":"alerte","other":"alertes"},"all_good":"Tout va bien","disks_attention":{"one":"{n} disque à vérifier","other":"{n} disques à vérifier"},"alerts_n":{"one":"{n} alerte","other":"{n} alertes"},"unhealthy":"en mauvais état","cpu_aria":"CPU {n} pour cent","load":"charge {n}","memory":"Mémoire","network":"Réseau","storage":"Stockage","mem_aria":"Sur {t} Gio : {a} applis et système, {c} cache ZFS, {f} libres","mem_line":"{c} cache · {f} libres sur {t} GiB","up":"envoi","down":"réception","link_down":"{n} : lien coupé","drives_aria":{"one":"{n} disque","other":"{n} disques"},"apps_memory":"Mémoire des applis","pool_full":"{p} rempli","pool":"Pool","add_integration":"Ajoutez d'abord l'intégration <b>NAS Bays for TrueNAS</b> : Paramètres → Appareils et services → Ajouter une intégration.","e_size":"Taille","e_full":"Complète","e_compact":"Compacte","e_colours":"Couleurs","e_follow":"Comme Home Assistant","e_darktext":"Texte sombre","e_whitetext":"Texte blanc","e_language":"Langue","e_lang_auto":"Comme Home Assistant","e_show":"Afficher sur la carte","e_vpn_line":"Ligne VPN","e_backups_line":"Ligne Sauvegardes","e_fill":"Remplir la hauteur de l'écran (pas sur téléphone)","e_maxw":"Largeur maximale en pixels (0 remplit tout l'espace)","e_vpn_opt":"Ligne VPN (facultatif)","e_vpn_help":"Choisissez un capteur qui indique si votre VPN est connecté. Laissez vide pour masquer la ligne. Le script d'aide Gluetun du README s'en charge pour vous.","e_vpn_sensor":"Capteur VPN","e_label":"Libellé (facultatif)","e_custom":"Cette carte utilise une disposition de boîtier personnalisée, définie dans son YAML.","e_bays_legend":"Baies de disques","e_bays_help":"Les disques remplissent les baies automatiquement. TrueNAS ne sait pas dans quelle baie se trouve un disque. Pour correspondre à votre boîtier, choisissez le disque de chaque baie grâce au numéro de série sur son étiquette.","e_bays_n":"Nombre de baies","e_bay":"Baie {n}","e_auto":"Automatique","e_no_pool":"hors pool","e_auto_btn":"Revenir à l'ordre automatique"},
"it":{"up_d":"attivo da {d} g {h} h","up_h":"attivo da {h} h {m} min","min_ago":"{n} min fa","h_ago":"{n} h fa","days_ago":"{n} giorni fa","no_data":"Nessun dato","no_data_for":"Nessun dato da {n} min","connected":"Connesso","not_connected":"Non connesso","connecting":"Connessione","running":"Attivo","stopped":"Fermo","not_found":"Non trovato","no_issues":"Nessun problema","issue_failing":"Controllo di stato non riuscito","issue_stopped":"Container fermo","issue_starting":"Avvio","issue_nocheck":"Nessun controllo di stato","backups":"Backup","no_snap_tasks":"Nessuna attività di snapshot","snap_failed":{"one":"{n} attività di snapshot non riuscita","other":"{n} attività di snapshot non riuscite"},"no_snaps_yet":"Ancora nessuno snapshot","last_snapshot":"Ultimo snapshot {when}","snapshots_n":{"one":"{n} snapshot","other":"{n} snapshot"},"remote_failed":{"one":"{n} backup esterno non riuscito","other":"{n} backup esterni non riusciti"},"no_remote":"Nessuna attività di replica, cloud o rsync","last_remote":"Ultimo backup esterno {when}","remote_not_run":"Backup esterno non ancora eseguito","scrub_running":"Scrub in corso","scrubbed":"Scrub il {d}","never_scrubbed":"Mai eseguito lo scrub","disks_errors":"{e} dischi su {n} con errori","scrub_errors":{"one":"{n} errore di scrub","other":"{n} errori di scrub"},"free":"{s} liberi","pct_full":"{p} pieno al {n} per cento","unknown":"Sconosciuto","empty":"Vuoto","gone":"Assente","missing":"Mancante","missing_l":"mancante","drive_aria":"{s}, {t} gradi, {h}","healthy_w":"integro","attention_w":"richiede attenzione","internal":"Interno","boot":"boot","none":"nessuno","bays":"Alloggiamenti","not_placed":"Non ancora in un alloggiamento","tap_drive":"Tocca un disco per i dettagli.","no_data_nas":"Nessun dato dal NAS.","not_reporting":"Il NAS non rileva questo disco. Potrebbe essere stato rimosso o guasto.","not_in_pool":"non in un pool","healthy_errors":"Integro. {r} errori di lettura, {w} di scrittura e {c} di checksum.","healthy_nopool":"Integro. Nessun avviso. Non in un pool.","problem":"Problema","state_errors":"{s}: {r} errori di lettura, {w} di scrittura e {c} di checksum.","nothing_since":"Nessun dato ricevuto dalle {t}","waiting":"In attesa del NAS","x_of_y":"{a} di {b}","apps_running":"app attive","alerts":{"one":"avviso","other":"avvisi"},"all_good":"Tutto bene","disks_attention":{"one":"{n} disco richiede attenzione","other":"{n} dischi richiedono attenzione"},"alerts_n":{"one":"{n} avviso","other":"{n} avvisi"},"unhealthy":"non integro","cpu_aria":"CPU {n} per cento","load":"carico {n}","memory":"Memoria","network":"Rete","storage":"Archiviazione","mem_aria":"Di {t} GiB: {a} app e sistema, {c} cache ZFS, {f} liberi","mem_line":"{c} cache · {f} liberi di {t} GiB","up":"invio","down":"ricezione","link_down":"{n}: collegamento assente","drives_aria":{"one":"{n} disco","other":"{n} dischi"},"apps_memory":"Memoria app","pool_full":"{p} pieno","pool":"Pool","add_integration":"Aggiungi prima l'integrazione <b>NAS Bays for TrueNAS</b>: Impostazioni → Dispositivi e servizi → Aggiungi integrazione.","e_size":"Dimensione","e_full":"Completa","e_compact":"Compatta","e_colours":"Colori","e_follow":"Come Home Assistant","e_darktext":"Testo scuro","e_whitetext":"Testo bianco","e_language":"Lingua","e_lang_auto":"Come Home Assistant","e_show":"Mostra sulla scheda","e_vpn_line":"Riga VPN","e_backups_line":"Riga backup","e_fill":"Riempi l'altezza dello schermo (non sui telefoni)","e_maxw":"Larghezza massima in pixel (0 riempie tutto lo spazio)","e_vpn_opt":"Riga VPN (facoltativa)","e_vpn_help":"Scegli un sensore che indichi se la VPN è connessa. Lascia vuoto per nascondere la riga. Lo script di aiuto per Gluetun nel README lo configura per te.","e_vpn_sensor":"Sensore VPN","e_label":"Etichetta (facoltativa)","e_custom":"Questa scheda usa un layout del case personalizzato, impostato nel suo YAML.","e_bays_legend":"Alloggiamenti dischi","e_bays_help":"I dischi riempiono gli alloggiamenti automaticamente. TrueNAS non sa in quale alloggiamento si trova un disco. Per rispecchiare il tuo case, scegli il disco di ogni alloggiamento usando il numero di serie sull'etichetta.","e_bays_n":"Numero di alloggiamenti","e_bay":"Alloggiamento {n}","e_auto":"Automatico","e_no_pool":"nessun pool","e_auto_btn":"Torna all'ordine automatico"},
"es":{"up_d":"activo desde hace {d} d {h} h","up_h":"activo desde hace {h} h {m} min","min_ago":"hace {n} min","h_ago":"hace {n} h","days_ago":"hace {n} días","no_data":"Sin datos","no_data_for":"Sin datos desde hace {n} min","connected":"Conectado","not_connected":"Sin conexión","connecting":"Conectando","running":"En marcha","stopped":"Detenido","not_found":"No encontrado","no_issues":"Sin problemas","issue_failing":"Falla la comprobación de estado","issue_stopped":"Contenedor detenido","issue_starting":"Iniciando","issue_nocheck":"Sin comprobación de estado","backups":"Copias","no_snap_tasks":"Sin tareas de instantáneas","snap_failed":{"one":"{n} tarea de instantáneas con fallo","other":"{n} tareas de instantáneas con fallo"},"no_snaps_yet":"Aún no hay instantáneas","last_snapshot":"Última instantánea {when}","snapshots_n":{"one":"{n} instantánea","other":"{n} instantáneas"},"remote_failed":{"one":"{n} copia externa con fallo","other":"{n} copias externas con fallo"},"no_remote":"Sin tareas de replicación, nube o rsync","last_remote":"Última copia externa {when}","remote_not_run":"Copia externa aún sin ejecutar","scrub_running":"Scrub en curso","scrubbed":"Scrub el {d}","never_scrubbed":"Nunca se ha hecho scrub","disks_errors":"{e} de {n} discos con errores","scrub_errors":{"one":"{n} error de scrub","other":"{n} errores de scrub"},"free":"{s} libres","pct_full":"{p} lleno al {n} por ciento","unknown":"Desconocido","empty":"Vacío","gone":"Ausente","missing":"Falta","missing_l":"falta","drive_aria":"{s}, {t} grados, {h}","healthy_w":"en buen estado","attention_w":"necesita atención","internal":"Interno","boot":"arranque","none":"ninguno","bays":"Bahías","not_placed":"Aún sin colocar en una bahía","tap_drive":"Toca un disco para ver sus detalles.","no_data_nas":"Sin datos del NAS.","not_reporting":"El NAS no detecta este disco. Puede que se haya retirado o haya fallado.","not_in_pool":"sin pool","healthy_errors":"En buen estado. {r} errores de lectura, {w} de escritura y {c} de suma de comprobación.","healthy_nopool":"En buen estado. Sin alertas. Sin pool.","problem":"Problema","state_errors":"{s}: {r} errores de lectura, {w} de escritura y {c} de suma de comprobación.","nothing_since":"Nada recibido desde las {t}","waiting":"Esperando al NAS","x_of_y":"{a} de {b}","apps_running":"apps en marcha","alerts":{"one":"alerta","other":"alertas"},"all_good":"Todo bien","disks_attention":{"one":"{n} disco necesita atención","other":"{n} discos necesitan atención"},"alerts_n":{"one":"{n} alerta","other":"{n} alertas"},"unhealthy":"con problemas","cpu_aria":"CPU {n} por ciento","load":"carga {n}","memory":"Memoria","network":"Red","storage":"Almacenamiento","mem_aria":"De {t} GiB: {a} apps y sistema, {c} caché ZFS, {f} libres","mem_line":"{c} caché · {f} libres de {t} GiB","up":"subida","down":"bajada","link_down":"{n}: sin enlace","drives_aria":{"one":"{n} disco","other":"{n} discos"},"apps_memory":"Memoria de apps","pool_full":"{p} lleno","pool":"Pool","add_integration":"Añade primero la integración <b>NAS Bays for TrueNAS</b>: Ajustes → Dispositivos y servicios → Añadir integración.","e_size":"Tamaño","e_full":"Completa","e_compact":"Compacta","e_colours":"Colores","e_follow":"Como Home Assistant","e_darktext":"Texto oscuro","e_whitetext":"Texto blanco","e_language":"Idioma","e_lang_auto":"Como Home Assistant","e_show":"Mostrar en la tarjeta","e_vpn_line":"Línea de VPN","e_backups_line":"Línea de copias","e_fill":"Ocupar toda la altura de la pantalla (no en móviles)","e_maxw":"Ancho máximo en píxeles (0 ocupa todo el espacio)","e_vpn_opt":"Línea de VPN (opcional)","e_vpn_help":"Elige un sensor que indique si tu VPN está conectada. Déjalo vacío para ocultar la línea. El script de ayuda de Gluetun del README lo configura por ti.","e_vpn_sensor":"Sensor de VPN","e_label":"Etiqueta (opcional)","e_custom":"Esta tarjeta usa un diseño de caja personalizado, definido en su YAML.","e_bays_legend":"Bahías de discos","e_bays_help":"Los discos llenan las bahías automáticamente. TrueNAS no sabe en qué bahía está cada disco. Para que coincida con tu caja, elige el disco de cada bahía usando el número de serie de su etiqueta.","e_bays_n":"Número de bahías","e_bay":"Bahía {n}","e_auto":"Automático","e_no_pool":"sin pool","e_auto_btn":"Volver al orden automático"},
"nl":{"up_d":"actief {d} d {h} u","up_h":"actief {h} u {m} min","min_ago":"{n} min geleden","h_ago":"{n} u geleden","days_ago":"{n} dagen geleden","no_data":"Geen gegevens","no_data_for":"{n} min geen gegevens","connected":"Verbonden","not_connected":"Niet verbonden","connecting":"Verbinden","running":"Actief","stopped":"Gestopt","not_found":"Niet gevonden","no_issues":"Geen problemen","issue_failing":"Statuscontrole mislukt","issue_stopped":"Container gestopt","issue_starting":"Opstarten","issue_nocheck":"Geen statuscontrole","backups":"Back-ups","no_snap_tasks":"Geen snapshottaken","snap_failed":{"one":"{n} snapshottaak mislukt","other":"{n} snapshottaken mislukt"},"no_snaps_yet":"Nog geen snapshots","last_snapshot":"Laatste snapshot {when}","snapshots_n":{"one":"{n} snapshot","other":"{n} snapshots"},"remote_failed":{"one":"{n} externe back-up mislukt","other":"{n} externe back-ups mislukt"},"no_remote":"Geen replicatie-, cloud- of rsync-taak","last_remote":"Laatste externe back-up {when}","remote_not_run":"Externe back-up nog niet uitgevoerd","scrub_running":"Scrub bezig","scrubbed":"Scrub op {d}","never_scrubbed":"Nog nooit een scrub","disks_errors":"{e} van {n} schijven met fouten","scrub_errors":{"one":"{n} scrubfout","other":"{n} scrubfouten"},"free":"{s} vrij","pct_full":"{p} {n} procent vol","unknown":"Onbekend","empty":"Leeg","gone":"Weg","missing":"Ontbreekt","missing_l":"ontbreekt","drive_aria":"{s}, {t} graden, {h}","healthy_w":"gezond","attention_w":"vraagt aandacht","internal":"Intern","boot":"boot","none":"geen","bays":"Sleuven","not_placed":"Nog niet in een sleuf geplaatst","tap_drive":"Tik op een schijf voor details.","no_data_nas":"Geen gegevens van de NAS.","not_reporting":"De NAS meldt deze schijf niet. Hij is misschien verwijderd of defect.","not_in_pool":"niet in een pool","healthy_errors":"Gezond. {r} lees-, {w} schrijf- en {c} controlesomfouten.","healthy_nopool":"Gezond. Geen meldingen. Niet in een pool.","problem":"Probleem","state_errors":"{s}: {r} lees-, {w} schrijf- en {c} controlesomfouten.","nothing_since":"Niets ontvangen sinds {t}","waiting":"Wachten op de NAS","x_of_y":"{a} van {b}","apps_running":"apps actief","alerts":{"one":"melding","other":"meldingen"},"all_good":"Alles goed","disks_attention":{"one":"{n} schijf vraagt aandacht","other":"{n} schijven vragen aandacht"},"alerts_n":{"one":"{n} melding","other":"{n} meldingen"},"unhealthy":"niet gezond","cpu_aria":"CPU {n} procent","load":"belasting {n}","memory":"Geheugen","network":"Netwerk","storage":"Opslag","mem_aria":"Van {t} GiB: {a} apps en systeem, {c} ZFS-cache, {f} vrij","mem_line":"{c} cache · {f} vrij van {t} GiB","up":"omhoog","down":"omlaag","link_down":"{n}: geen verbinding","drives_aria":{"one":"{n} schijf","other":"{n} schijven"},"apps_memory":"Geheugen voor apps","pool_full":"{p} vol","pool":"Pool","add_integration":"Voeg eerst de integratie <b>NAS Bays for TrueNAS</b> toe: Instellingen → Apparaten en diensten → Integratie toevoegen.","e_size":"Grootte","e_full":"Volledig","e_compact":"Compact","e_colours":"Kleuren","e_follow":"Zoals Home Assistant","e_darktext":"Donkere tekst","e_whitetext":"Witte tekst","e_language":"Taal","e_lang_auto":"Zoals Home Assistant","e_show":"Tonen op de kaart","e_vpn_line":"VPN-regel","e_backups_line":"Back-upregel","e_fill":"Hele schermhoogte vullen (niet op telefoons)","e_maxw":"Maximale breedte in pixels (0 vult de hele ruimte)","e_vpn_opt":"VPN-regel (optioneel)","e_vpn_help":"Kies een sensor die aangeeft of je VPN verbonden is. Laat leeg om de regel te verbergen. Het Gluetun-hulpscript in de README stelt dit voor je in.","e_vpn_sensor":"VPN-sensor","e_label":"Label (optioneel)","e_custom":"Deze kaart gebruikt een eigen behuizingsindeling, ingesteld in de YAML.","e_bays_legend":"Schijfsleuven","e_bays_help":"Schijven vullen de sleuven automatisch. TrueNAS weet niet in welke sleuf een schijf zit. Kies daarom per sleuf de schijf aan de hand van het serienummer op het etiket, zodat het klopt met je behuizing.","e_bays_n":"Aantal sleuven","e_bay":"Sleuf {n}","e_auto":"Automatisch","e_no_pool":"geen pool","e_auto_btn":"Terug naar automatische volgorde"},
"pl":{"up_d":"działa {d} d {h} godz.","up_h":"działa {h} godz. {m} min","min_ago":"{n} min temu","h_ago":"{n} godz. temu","days_ago":"{n} dni temu","no_data":"Brak danych","no_data_for":"Brak danych od {n} min","connected":"Połączono","not_connected":"Brak połączenia","connecting":"Łączenie","running":"Działa","stopped":"Zatrzymano","not_found":"Nie znaleziono","no_issues":"Bez problemów","issue_failing":"Kontrola stanu nie powiodła się","issue_stopped":"Kontener zatrzymany","issue_starting":"Uruchamianie","issue_nocheck":"Brak kontroli stanu","backups":"Kopie","no_snap_tasks":"Brak zadań migawek","snap_failed":{"one":"{n} zadanie migawek nieudane","few":"{n} zadania migawek nieudane","many":"{n} zadań migawek nieudanych","other":"{n} zadania migawek nieudane"},"no_snaps_yet":"Jeszcze brak migawek","last_snapshot":"Ostatnia migawka {when}","snapshots_n":{"one":"{n} migawka","few":"{n} migawki","many":"{n} migawek","other":"{n} migawki"},"remote_failed":{"one":"{n} kopia zewnętrzna nieudana","few":"{n} kopie zewnętrzne nieudane","many":"{n} kopii zewnętrznych nieudanych","other":"{n} kopii zewnętrznych nieudanych"},"no_remote":"Brak zadań replikacji, chmury lub rsync","last_remote":"Ostatnia kopia zewnętrzna {when}","remote_not_run":"Kopia zewnętrzna jeszcze nie działała","scrub_running":"Trwa scrub","scrubbed":"Scrub {d}","never_scrubbed":"Nigdy nie wykonano scrub","disks_errors":"Dyski z błędami: {e} z {n}","scrub_errors":{"one":"{n} błąd scrub","few":"{n} błędy scrub","many":"{n} błędów scrub","other":"{n} błędu scrub"},"free":"{s} wolne","pct_full":"{p} zapełniony w {n} procentach","unknown":"Nieznany","empty":"Puste","gone":"Brak","missing":"Brak","missing_l":"brak","drive_aria":"{s}, {t} stopni, {h}","healthy_w":"sprawny","attention_w":"wymaga uwagi","internal":"Wewnętrzny","boot":"boot","none":"brak","bays":"Kieszenie","not_placed":"Jeszcze nie w kieszeni","tap_drive":"Dotknij dysku, aby zobaczyć szczegóły.","no_data_nas":"Brak danych z NAS.","not_reporting":"NAS nie zgłasza tego dysku. Mógł zostać wyjęty lub uległ awarii.","not_in_pool":"poza pulą","healthy_errors":"Sprawny. Błędy odczytu: {r}, zapisu: {w}, sum kontrolnych: {c}.","healthy_nopool":"Sprawny. Brak alertów. Poza pulą.","problem":"Problem","state_errors":"{s}: błędy odczytu: {r}, zapisu: {w}, sum kontrolnych: {c}.","nothing_since":"Brak danych od {t}","waiting":"Oczekiwanie na NAS","x_of_y":"{a} z {b}","apps_running":"aplikacji działa","alerts":{"one":"alert","few":"alerty","many":"alertów","other":"alertu"},"all_good":"Wszystko dobrze","disks_attention":{"one":"{n} dysk wymaga uwagi","few":"{n} dyski wymagają uwagi","many":"{n} dysków wymaga uwagi","other":"{n} dysku wymaga uwagi"},"alerts_n":{"one":"{n} alert","few":"{n} alerty","many":"{n} alertów","other":"{n} alertu"},"unhealthy":"niesprawna","cpu_aria":"Procesor {n} procent","load":"obciążenie {n}","memory":"Pamięć","network":"Sieć","storage":"Dyski","mem_aria":"Z {t} GiB: {a} aplikacje i system, {c} pamięć ZFS, {f} wolne","mem_line":"{c} pamięć podr. · {f} wolne z {t} GiB","up":"wysyłanie","down":"pobieranie","link_down":"{n}: brak połączenia","drives_aria":{"one":"{n} dysk","few":"{n} dyski","many":"{n} dysków","other":"{n} dysku"},"apps_memory":"Pamięć aplikacji","pool_full":"{p} zajęte","pool":"Pula","add_integration":"Najpierw dodaj integrację <b>NAS Bays for TrueNAS</b>: Ustawienia → Urządzenia oraz usługi → Dodaj integrację.","e_size":"Rozmiar","e_full":"Pełny","e_compact":"Kompaktowy","e_colours":"Kolory","e_follow":"Jak w Home Assistant","e_darktext":"Ciemny tekst","e_whitetext":"Biały tekst","e_language":"Język","e_lang_auto":"Jak w Home Assistant","e_show":"Pokaż na karcie","e_vpn_line":"Wiersz VPN","e_backups_line":"Wiersz kopii","e_fill":"Wypełnij wysokość ekranu (nie na telefonach)","e_maxw":"Maksymalna szerokość w pikselach (0 wypełnia całe miejsce)","e_vpn_opt":"Wiersz VPN (opcjonalny)","e_vpn_help":"Wybierz czujnik, który mówi, czy VPN jest połączony. Zostaw puste, aby ukryć wiersz. Skrypt pomocniczy Gluetun z README ustawi to za Ciebie.","e_vpn_sensor":"Czujnik VPN","e_label":"Etykieta (opcjonalna)","e_custom":"Ta karta używa własnego układu obudowy, ustawionego w jej YAML.","e_bays_legend":"Kieszenie na dyski","e_bays_help":"Dyski wypełniają kieszenie automatycznie. TrueNAS nie wie, w której kieszeni jest dysk. Aby odwzorować obudowę, wybierz dysk dla każdej kieszeni według numeru seryjnego z etykiety.","e_bays_n":"Liczba kieszeni","e_bay":"Kieszeń {n}","e_auto":"Automatycznie","e_no_pool":"bez puli","e_auto_btn":"Wróć do kolejności automatycznej"},
"pt":{"up_d":"ativo há {d} d {h} h","up_h":"ativo há {h} h {m} min","min_ago":"há {n} min","h_ago":"há {n} h","days_ago":"há {n} dias","no_data":"Sem dados","no_data_for":"Sem dados há {n} min","connected":"Ligado","not_connected":"Não ligado","connecting":"A ligar","running":"Ativo","stopped":"Parado","not_found":"Não encontrado","no_issues":"Sem problemas","issue_failing":"Verificação de estado falhou","issue_stopped":"Contentor parado","issue_starting":"A iniciar","issue_nocheck":"Sem verificação de estado","backups":"Cópias","no_snap_tasks":"Sem tarefas de snapshot","snap_failed":{"one":"{n} tarefa de snapshot falhou","other":"{n} tarefas de snapshot falharam"},"no_snaps_yet":"Ainda sem snapshots","last_snapshot":"Último snapshot {when}","snapshots_n":{"one":"{n} snapshot","other":"{n} snapshots"},"remote_failed":{"one":"{n} cópia externa falhou","other":"{n} cópias externas falharam"},"no_remote":"Sem tarefas de replicação, nuvem ou rsync","last_remote":"Última cópia externa {when}","remote_not_run":"Cópia externa ainda não executada","scrub_running":"Scrub em curso","scrubbed":"Scrub a {d}","never_scrubbed":"Nunca fez scrub","disks_errors":"{e} de {n} discos com erros","scrub_errors":{"one":"{n} erro de scrub","other":"{n} erros de scrub"},"free":"{s} livres","pct_full":"{p} {n} por cento cheio","unknown":"Desconhecido","empty":"Vazio","gone":"Ausente","missing":"Em falta","missing_l":"em falta","drive_aria":"{s}, {t} graus, {h}","healthy_w":"em bom estado","attention_w":"precisa de atenção","internal":"Interno","boot":"arranque","none":"nenhum","bays":"Baías","not_placed":"Ainda não colocado numa baía","tap_drive":"Toque num disco para ver os detalhes.","no_data_nas":"Sem dados do NAS.","not_reporting":"O NAS não está a reportar este disco. Pode ter sido removido ou ter falhado.","not_in_pool":"fora de um pool","healthy_errors":"Em bom estado. {r} erros de leitura, {w} de escrita e {c} de soma de verificação.","healthy_nopool":"Em bom estado. Sem alertas. Fora de um pool.","problem":"Problema","state_errors":"{s}: {r} erros de leitura, {w} de escrita e {c} de soma de verificação.","nothing_since":"Nada recebido desde as {t}","waiting":"À espera do NAS","x_of_y":"{a} de {b}","apps_running":"apps ativas","alerts":{"one":"alerta","other":"alertas"},"all_good":"Tudo bem","disks_attention":{"one":"{n} disco precisa de atenção","other":"{n} discos precisam de atenção"},"alerts_n":{"one":"{n} alerta","other":"{n} alertas"},"unhealthy":"com problemas","cpu_aria":"CPU {n} por cento","load":"carga {n}","memory":"Memória","network":"Rede","storage":"Armazenamento","mem_aria":"De {t} GiB: {a} apps e sistema, {c} cache ZFS, {f} livres","mem_line":"{c} cache · {f} livres de {t} GiB","up":"envio","down":"receção","link_down":"{n}: sem ligação","drives_aria":{"one":"{n} disco","other":"{n} discos"},"apps_memory":"Memória das apps","pool_full":"{p} cheio","pool":"Pool","add_integration":"Adicione primeiro a integração <b>NAS Bays for TrueNAS</b>: Definições → Dispositivos e serviços → Adicionar integração.","e_size":"Tamanho","e_full":"Completo","e_compact":"Compacto","e_colours":"Cores","e_follow":"Como o Home Assistant","e_darktext":"Texto escuro","e_whitetext":"Texto branco","e_language":"Idioma","e_lang_auto":"Como o Home Assistant","e_show":"Mostrar no cartão","e_vpn_line":"Linha da VPN","e_backups_line":"Linha das cópias","e_fill":"Preencher a altura do ecrã (não em telemóveis)","e_maxw":"Largura máxima em píxeis (0 preenche todo o espaço)","e_vpn_opt":"Linha da VPN (opcional)","e_vpn_help":"Escolha um sensor que indique se a VPN está ligada. Deixe vazio para ocultar a linha. O script de ajuda do Gluetun no README configura isto por si.","e_vpn_sensor":"Sensor da VPN","e_label":"Etiqueta (opcional)","e_custom":"Este cartão usa um esquema de caixa personalizado, definido no YAML.","e_bays_legend":"Baías de discos","e_bays_help":"Os discos preenchem as baías automaticamente. O TrueNAS não sabe em que baía está cada disco. Para corresponder à sua caixa, escolha o disco de cada baía pelo número de série na etiqueta.","e_bays_n":"Número de baías","e_bay":"Baía {n}","e_auto":"Automático","e_no_pool":"sem pool","e_auto_btn":"Voltar à ordem automática"}};
const LANG_NAMES = {"en": "English", "de": "Deutsch", "fr": "Français", "it": "Italiano", "es": "Español", "nl": "Nederlands", "pl": "Polski", "pt": "Português"};
let LANG = "en";
const pickLang = (hass, cfg) => {
  const raw = String(cfg?.language || hass?.locale?.language || hass?.language || "en").toLowerCase();
  LANG = T[raw] ? raw : T[raw.split(/[-_]/)[0]] ? raw.split(/[-_]/)[0] : "en";
};
const t = (key, vars = {}) => {
  let v = T[LANG][key] ?? T.en[key] ?? key;
  if (typeof v === "object") v = v[new Intl.PluralRules(LANG).select(vars.n ?? 0)] ?? v.other;
  return v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};
/* An empty bay: the flap swung open, so you can see the rails and connector inside. */
const EMPTY_BAY = '<svg class="ebay" viewBox="0 0 100 250" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="nbF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b424b"/><stop offset="1" stop-color="#1b1f24"/></linearGradient><linearGradient id="nbL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#23272d"/><stop offset="1" stop-color="#07080a"/></linearGradient><linearGradient id="nbR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#1c2025"/><stop offset="1" stop-color="#07080a"/></linearGradient><linearGradient id="nbT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14171b"/><stop offset="1" stop-color="#050607"/></linearGradient><linearGradient id="nbB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2a2f35"/><stop offset="1" stop-color="#08090b"/></linearGradient><linearGradient id="nbH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a525c"/><stop offset=".22" stop-color="#2e343b"/><stop offset="1" stop-color="#14171b"/></linearGradient></defs><rect x=".5" y=".5" width="99" height="249" rx="4" fill="url(#nbF)" stroke="#000"/><rect x="5" y="5" width="90" height="240" rx="2" fill="#050607"/><path d="M5 5 L28 32 V172 L5 245 Z" fill="url(#nbL)"/><path d="M95 5 L72 32 V172 L95 245 Z" fill="url(#nbR)"/><path d="M5 5 H95 L72 32 H28 Z" fill="url(#nbT)"/><path d="M5 245 H95 L72 172 H28 Z" fill="url(#nbB)"/><rect x="28" y="32" width="44" height="140" fill="#0d2019"/><path d="M33 40 H67 M33 48 H52 M60 150 V164 M36 150 V164" stroke="#1f4a39" stroke-width="1" fill="none"/><rect x="45" y="62" width="10" height="66" rx="1" fill="#16181b" stroke="#454b52" stroke-width=".7"/><rect x="48.5" y="66" width="3" height="42" fill="#b89a4a"/><rect x="48.5" y="111" width="3" height="13" fill="#b89a4a"/><path d="M5 58 L28 72 M5 62 L28 75 M95 58 L72 72 M95 62 L72 75 M5 170 L28 140 M5 174 L28 143 M95 170 L72 140 M95 174 L72 143" stroke="#59616b" stroke-width="1.100" fill="none"/><path d="M1.5 141.3 L98.5 141.3 L85.4 234.0 L14.6 234.0 Z" fill="#000" opacity=".45" transform="translate(0 7)"/><path d="M2.0 126.0 L98.0 126.0 L84.0 234.0 L16.0 234.0 Z M19.9 161.5 L80.1 161.5 L78.8 175.7 L21.2 175.7 Z M21.4 178.0 L78.6 178.0 L77.4 191.4 L22.6 191.4 Z M22.8 193.6 L77.2 193.6 L75.9 206.4 L24.1 206.4 Z M24.3 208.6 L75.7 208.6 L74.5 221.0 L25.5 221.0 Z" fill="url(#nbH)" fill-rule="evenodd" stroke="#050607" stroke-width=".8"/><path d="M2.0 126.0 L98.0 126.0" stroke="#7d8792" stroke-width="1.300"/><path d="M21.6 134.5 L78.4 134.5 L77.1 153.5 L22.9 153.5 Z" fill="#0c0e11" stroke="#7d8792" stroke-width=".6"/><rect x="14" y="232" width="72" height="15" rx="1.500" fill="#1a1d21" stroke="#000" stroke-width=".6"/><rect x="26" y="235.500" width="48" height="3" fill="#2e8fd6"/><rect x="42" y="241" width="16" height="4" rx="1" fill="#0b0d0f"/></svg>';
const WARN_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19L12 4Z"/></svg>';

/* Everything the card shows comes from the integration's sensors. */
function readModel(hass, cfg) {
  const regs = Object.values(hass.entities || {}).filter((e) => e.platform === "nas_bays");
  const ids = regs.map((e) => e.entity_id);
  if (!ids.length) return { missing: true };
  const deviceName = hass.devices?.[regs[0].device_id]?.name;
  const roles = {}, disks = {}, pools = {}, ghosts = [];
  for (const id of ids) {
    const st = hass.states[id];
    if (!st) continue;
    const a = st.attributes;
    if (cfg.entry && a.nas_bays_entry && a.nas_bays_entry !== cfg.entry) continue;
    if (a.nas_bays_role === "disk") disks[a.serial] = { ...a, temperature: num(st.state), entity: id };
    else if (a.nas_bays_role === "pool") pools[a.name] = { ...a, percent: num(st.state) };
    else if (a.nas_bays_role) roles[a.nas_bays_role] = st;
    else ghosts.push(st);
  }
  const health = roles.health;
  const unavailable = ghosts.filter((g) => g.entity_id.endsWith("_health")).length > 0 || !health;
  const healthGhost = ghosts.find((g) => g.entity_id.endsWith("_health"));
  const v = (r) => (roles[r] ? num(roles[r].state) : null);
  const boot = roles.boot_time ? new Date(roles.boot_time.state) : null;
  return {
    offline: unavailable, since: healthGhost ? new Date(healthGhost.last_changed) : null,
    state: health ? health.state : "unknown", ghosts,
    summary: health ? health.attributes.summary : "",
    summaryKey: health?.attributes.summary_key, summaryN: health?.attributes.summary_n, summaryPool: health?.attributes.summary_pool, summaryStatus: health?.attributes.summary_status,
    host: (health && health.attributes.hostname) || cfg.name || deviceName || "NAS",
    version: health ? health.attributes.version : "", cpuModel: health ? health.attributes.model : "",
    memTotal: health ? health.attributes.memory_total : null, netSpeed: health ? health.attributes.net_speed : null, nics: health ? health.attributes.interfaces || [] : [],
    boot, cpu: v("cpu_usage"), temp: v("cpu_temperature"), load: v("load"),
    memApps: v("memory_apps"), memCache: v("memory_cache"), memFree: v("memory_free"),
    down: v("net_down"), up: v("net_up"), alerts: v("alerts"),
    alertList: roles.alerts ? roles.alerts.attributes.alert_list || [] : [],
    appsRunning: v("apps_running"), appsTotal: roles.apps_running ? roles.apps_running.attributes.apps_total : null,
    snapshots: v("snapshots"), backup: roles.snapshots?.attributes.backup,
    disks, pools,
  };
}

function uptime(boot) {
  if (!boot || isNaN(boot)) return "";
  const s = (Date.now() - boot) / 1000, d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return d ? t("up_d", { d, h }) : t("up_h", { h, m: Math.floor((s % 3600) / 60) });
}

/* The integration also sends English text, which older versions show. */
const summaryText = (m) => {
  if (m.summaryKey === "all_good") return t("all_good");
  if (m.summaryKey === "pool_status") return `${m.summaryPool} ${m.summaryStatus || t("unhealthy")}`;
  if (m.summaryKey) return t(m.summaryKey, { n: m.summaryN });
  return m.summary || t("no_data");
};

const CHECK_ICON = '<svg class="ico2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 15-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9Z"/></svg>';
const CROSS_ICON = '<svg class="ico2" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4Z"/></svg>';

/* [number, unit] so the number can be big and the unit small. */
function rate(mbps) {
  if (mbps == null) return ["–", "Mb/s"];
  const a = Math.abs(mbps);
  if (a >= 1000) return [(a / 1000).toFixed(2), "Gb/s"];
  if (a >= 1) return [a.toFixed(1), "Mb/s"];
  return [(a * 1000).toFixed(0), "kb/s"];
}

const ago = (iso) => {
  const when = Date.parse(iso);
  if (!when) return null;
  const min = Math.max(0, Math.round((Date.now() - when) / 60000));
  if (min < 60) return t("min_ago", { n: min });
  const hours = Math.floor(min / 60);
  return hours < 48 ? t("h_ago", { n: hours }) : t("days_ago", { n: Math.floor(hours / 24) });
};
const shown = (cfg, name) => !(cfg.hide || []).includes(name);
const statusLine = (title, level, parts) => `<div class="sline ${level}"><span class="pico">${LEVEL_ICON[level]}</span><b>${title}</b><span class="stext">${parts.filter(Boolean).map(esc).join(" · ")}</span></div>`;

const VPN_WORDS = { connected: "connected", not_connected: "not_connected", connecting: "connecting", running: "running", stopped: "stopped", missing: "not_found", on: "connected", off: "not_connected" };
const VPN_ISSUES = { "Health check failing": "issue_failing", "Container stopped": "issue_stopped", Starting: "issue_starting", "No health check": "issue_nocheck" };
/* Any sensor works. A "checked" time, which the helper script sends, lets the card spot a script that has stopped. */
function vpnLine(hass, cfg) {
  if (!cfg.vpn_entity || !shown(cfg, "vpn")) return "";
  const st = hass.states[cfg.vpn_entity];
  if (!st || st.state === "unavailable" || st.state === "unknown") return statusLine("VPN", "bad", [cfg.vpn_label, t("no_data")]);
  const a = st.attributes, label = cfg.vpn_label || [a.provider, a.vpn_type].filter(Boolean).join(" ");
  const checked = Date.parse(a.checked);
  if (checked && Date.now() - checked > 300000) return statusLine("VPN", "bad", [label, t("no_data_for", { n: Math.round((Date.now() - checked) / 60000) })]);
  const good = ["connected", "on"].includes(st.state);
  const words = VPN_WORDS[st.state] ? t(VPN_WORDS[st.state]) : st.state;
  const issue = a.issue ? (VPN_ISSUES[a.issue] ? t(VPN_ISSUES[a.issue]) : a.issue) : good ? t("no_issues") : "";
  return statusLine("VPN", good ? "ok" : "warn", [label, words, a.location, issue]);
}

function backupLine(m, cfg) {
  const b = m.backup;
  if (!b?.known || !shown(cfg, "backups")) return "";
  /* Nothing set up: stay out of the way, unless the owner asked to be warned. */
  if (!b.snapshot_tasks && !b.remote_tasks && !cfg.warn_no_replication) return "";
  const problems = [];
  const hours = cfg.snapshot_warn_hours ?? 48;
  const age = b.last_snapshot ? (Date.now() - Date.parse(b.last_snapshot)) / 3600000 : null;
  let snap;
  if (!b.snapshot_tasks) { snap = t("no_snap_tasks"); problems.push(1); }
  else if (b.snapshot_failed) { snap = t("snap_failed", { n: b.snapshot_failed }); problems.push(1); }
  else if (age == null) { snap = t("no_snaps_yet"); problems.push(1); }
  else { snap = t("last_snapshot", { when: ago(b.last_snapshot) }); if (age > hours) problems.push(1); }
  let remote;
  if (b.remote_failed) { remote = t("remote_failed", { n: b.remote_failed }); problems.push(1); }
  else if (!b.remote_tasks) { remote = t("no_remote"); if (cfg.warn_no_replication) problems.push(1); }
  else remote = b.last_remote ? t("last_remote", { when: ago(b.last_remote) }) : t("remote_not_run");
  return statusLine(t("backups"), problems.length ? "warn" : "ok", [snap, m.snapshots != null ? t("snapshots_n", { n: m.snapshots }) : "", remote]);
}

const LEVEL_ICON = { ok: CHECK_ICON, warn: WARN_ICON, bad: CROSS_ICON, none: "" };
function poolTile(p, cfg) {
  const pct = p.total && p.used != null ? (p.used / p.total) * 100 : p.percent;
  const ended = p.scrub_end ? new Date(p.scrub_end).toLocaleDateString(LANG, { day: "numeric", month: "short" }) : null;
  const overdue = p.scrub_state !== "SCANNING" && p.scrub_end && (Date.now() - Date.parse(p.scrub_end)) / 864e5 > (cfg.scrub_warn_days ?? 45);
  const scan = p.scrub_state === "SCANNING" ? t("scrub_running") : ended ? t("scrubbed", { d: ended }) : t("never_scrubbed");
  const scanWarn = overdue || (p.scrub_errors > 0);
  const barColor = !p.healthy || pct >= 90 ? "var(--nb-bad)" : pct >= 80 ? "var(--nb-warn)" : "var(--nb-a)";
  const notes = [p.disks_with_errors ? t("disks_errors", { e: p.disks_with_errors, n: p.disks_total }) : "", p.scrub_errors ? t("scrub_errors", { n: p.scrub_errors }) : ""].filter(Boolean).join(" · ");
  return `<div class="ptile"><div class="ptop"><b class="pname">${esc(p.name)}</b><span class="st ${p.healthy ? "good" : "bad"}">${esc(p.status || t("unknown"))}</span><span class="pfree">${fmt(pct, 0)}% · ${esc(t("free", { s: binSize(p.available) }))}</span></div>
    <div class="bar" role="img" aria-label="${esc(t("pct_full", { p: p.name, n: fmt(pct, 0) }))}"><i style="width:${Math.min(100, pct || 0)}%;background:${barColor}"></i></div>
    <div class="small"><span class="${scanWarn ? "warnword" : ""}">${esc(scan)}</span>${notes ? ` · <span class="warnword">${esc(notes)}</span>` : ""}</div></div>`;
}

const CSS = `
:host { --nb-fg: var(--primary-text-color); --nb-muted: var(--secondary-text-color); --nb-panel: rgba(127,127,127,.13); --nb-well: rgba(127,127,127,.1); --nb-bay: rgba(127,127,127,.16); --nb-line: rgba(127,127,127,.45); --nb-bar: rgba(127,127,127,.25);
  --nb-ok: #0a7d57; --nb-warn: #8a5a00; --nb-bad: #b3261e; --nb-warnbg: rgba(255,180,40,.2); --nb-badbg: rgba(230,60,50,.16); --nb-okbg: rgba(40,190,140,.16); --nb-a: #1b6fb8; --nb-b: #66a9dc; }
.dark { --nb-ok: #63e6be; --nb-warn: #ffc24b; --nb-bad: #ff9d94; --nb-a: #7cc4ff; --nb-b: #3d8fd1; --nb-well: rgba(0,0,0,.28); }
.force { --nb-fg: #fff; --nb-muted: #c3d4e6; }
ha-card { padding: 12px; color: var(--nb-fg); display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; }
.dark.force ha-card, .force ha-card { color: #fff; }
.head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.head .who { flex: 1 1 200px; min-width: 0; }
.host { font-size: 20px; font-weight: 700; line-height: 1.15; }
.sub, .cap, .small { color: var(--nb-muted); font-size: 13px; line-height: 1.35; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 13px; font-weight: 600; max-width: 100%; box-sizing: border-box; }
.s-ok { background: var(--nb-okbg); color: var(--nb-ok); } .s-warning { background: var(--nb-warnbg); color: var(--nb-warn); }
.s-critical { background: var(--nb-badbg); color: var(--nb-bad); } .s-off { background: var(--nb-panel); color: var(--nb-fg); }
.ico { width: 15px; height: 15px; fill: currentColor; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; flex: none; }
.bay.warning .ico, .strip.warning .ico { color: var(--nb-warn); } .bay.critical .ico, .strip.critical .ico { color: var(--nb-bad); }
.chassis { padding: 8px; border-radius: 12px; background: var(--nb-well); display: flex; flex-direction: column; gap: 8px; }
.cage.std { flex: 1 1 100%; }

.dock { display: flex; flex-wrap: wrap; gap: 8px; } .dock .strip { flex: 1 1 210px; width: auto; min-height: 40px; } .dock .detail { flex: 3 1 320px; min-width: 0; padding: 6px 10px; justify-content: center; }
.cages { display: flex; flex-wrap: wrap; gap: 12px; }
.cage { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.cage.vertical { flex: 2 1 340px; } .cage.horizontal { flex: 1 1 210px; }
.label { font-size: 12px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--nb-muted); }
.slots { display: grid; gap: 6px; } .vertical .slots { grid-template-columns: repeat(auto-fit, minmax(44px, 1fr)); } .horizontal .slots { grid-template-columns: minmax(0, 1fr); }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible { outline: 2px solid var(--nb-fg); outline-offset: 2px; }
.bay { box-sizing: border-box; border-radius: 7px; border: 2px solid var(--nb-line); background: var(--nb-bay); padding: 0; min-width: 0; }
.bay.warning { border-color: var(--nb-warn); background: var(--nb-warnbg); } .bay.critical, .bay.gone { border-color: var(--nb-bad); background: var(--nb-badbg); }
.bay.sel { outline: 2px solid var(--nb-fg); outline-offset: 1px; }
.vertical .bay { width: 100%; height: 190px; padding: 7px 3px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.horizontal .bay { width: 100%; min-height: 44px; padding: 0 9px; display: flex; align-items: center; gap: 8px; }
.led { width: 10px; height: 10px; border-radius: 50%; background: var(--nb-ok); flex: none; }
.vents { flex: 1; align-self: stretch; margin-inline: 8px; background: repeating-linear-gradient(0deg, var(--nb-line) 0 2px, transparent 2px 6px); opacity: .7; }
.horizontal .vents { flex: 1 1 24px; align-self: center; height: 22px; margin: 0; background: repeating-linear-gradient(90deg, var(--nb-line) 0 2px, transparent 2px 6px); min-width: 24px; }
.horizontal .tag { flex: 0 1 auto; min-width: 0; max-width: 38%; }
.t { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 16px; font-weight: 600; line-height: 1; } .t.hot { color: var(--nb-warn); }
.tag { font-size: 12px; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: var(--nb-muted); }
.vertical .sz { font-size: 12px; color: var(--nb-muted); } .horizontal .sz { font-size: 12px; color: var(--nb-muted); white-space: nowrap; }
.empty { box-sizing: border-box; border: 1px dashed var(--nb-line); border-radius: 7px; color: var(--nb-muted); font-size: 12px; display: flex; align-items: center; justify-content: center; }
.vertical .empty { height: 190px; align-items: flex-end; padding-bottom: 8px; } .horizontal .empty { min-height: 44px; }
.strip { box-sizing: border-box; width: 100%; min-height: 44px; padding: 0 10px; border-radius: 7px; border: 2px solid var(--nb-line); background: var(--nb-bay); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; text-align: left; }
.strip.warning { border-color: var(--nb-warn); background: var(--nb-warnbg); } .strip.critical { border-color: var(--nb-bad); background: var(--nb-badbg); } .strip.sel { outline: 2px solid var(--nb-fg); outline-offset: 1px; }
.strip .sp { margin-left: auto; } .strip b { font-size: 14px; }
.detail { padding: 10px 12px; border-radius: 8px; background: var(--nb-bay); display: flex; flex-direction: column; gap: 3px; }
.detail.warning { background: var(--nb-warnbg); } .detail.critical { background: var(--nb-badbg); }
.detail .title { display: flex; flex-wrap: wrap; gap: 3px 12px; align-items: baseline; } .detail .ser { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 600; }
.msg { font-size: 14px; } .msg.ok { color: var(--nb-ok); } .msg.warning { color: var(--nb-warn); } .msg.critical { color: var(--nb-bad); }
.tiles { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
.tile { padding: 10px; border-radius: 12px; background: var(--nb-panel); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.tile h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--nb-muted); }
.big { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 25px; font-weight: 600; line-height: 1; } .big small { font-size: 14px; }
.bar { display: flex; height: 12px; border-radius: 3px; overflow: hidden; background: var(--nb-bar); margin-block: 4px; }
.bar i { display: block; height: 100%; }
.pools { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 8px; }
.ptile { padding: 9px 10px; border-radius: 12px; background: var(--nb-panel); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.slines { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 8px; }
.sline { display: flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 10px; background: var(--nb-panel); font-size: 13px; line-height: 1.35; min-width: 0; }
.sline b { flex: none; } .stext { min-width: 0; overflow-wrap: anywhere; } .sline.ok .pico { color: var(--nb-ok); } .sline.warn { background: var(--nb-warnbg); } .sline.warn .pico, .sline.warn b { color: var(--nb-warn); } .sline.bad { background: var(--nb-badbg); } .sline.bad .pico, .sline.bad b { color: var(--nb-bad); }
.pooltop { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; } .pooltop b { font-size: 16px; overflow-wrap: anywhere; }
.st { font-size: 13px; font-weight: 600; } .st.good { color: var(--nb-ok); } .st.bad { color: var(--nb-bad); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 5px 10px; border-radius: 8px; background: var(--nb-panel); font-size: 13px; border: 0; } .chip.warn { background: var(--nb-warnbg); color: var(--nb-warn); } .chip b { font-weight: 700; }
.alerts { margin: 0; padding: 10px 12px 10px 28px; border-radius: 8px; background: var(--nb-panel); font-size: 14px; display: grid; gap: 4px; }
.leds { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 4px; } .leds i { height: 12px; border-radius: 3px; background: var(--nb-ok); }
.leds .warning { background: var(--nb-warn); } .leds .critical, .leds .gone { background: var(--nb-bad); } .leds .off { background: var(--nb-line); }
.ico2 { width: 16px; height: 16px; fill: currentColor; flex: none; }
.nrate span:last-child { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 600; }
ha-card { container-type: inline-size; width: 100%; max-width: var(--nb-max, none); margin-inline: auto; }
.cage.std .slots { grid-template-columns: repeat(var(--c, 12), minmax(0, 1fr)); gap: 5px; }
.cage.std .bay, .cage.std .empty { height: 130px; } .cage.std .bay { padding: 6px 2px; justify-content: flex-start; gap: 4px; } .cage.std .bay .mono { margin-top: auto; } .cage.std .empty { padding-bottom: 6px; font-size: 11px; } .cage.std .tag { font-size: 11px; } .cage.std .t { font-size: 15px; } .cage.std .sz { font-size: 11px; }
.cage.std .empty { position: relative; padding: 0; border: 0; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,.5); }
.ebay { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.elabel { position: absolute; left: 0; right: 0; top: calc(57.6% - 6px); text-align: center; font-size: 10px; line-height: 1.1; color: #c7ced6; }
@container (max-width: 560px) { .cage.std .slots { grid-template-columns: repeat(6, minmax(0, 1fr)); } .cage.std .empty { display: none; } }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } .stats b { display: block; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 18px; }

.pico { display: inline-flex; flex: none; }
.warnword { color: var(--nb-warn); font-weight: 600; }
.tiles { grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr)); }
@media (min-width: 620px) {
.fill ha-card { min-height: var(--nb-fill-h, 0); }
.fill .chassis { flex: 3 1 auto; } .fill .cages { flex: 1 1 auto; } .fill .cage.std { display: flex; } .fill .cage.std .slots { flex: 1 1 auto; grid-auto-rows: 1fr; }
.fill .cage.std .bay, .fill .cage.std .empty { height: auto; min-height: 104px; } .fill .cage.std .bay { gap: 8px; padding: 10px 2px; }
.fill .cage.std .t { font-size: 21px; } .fill .cage.std .tag, .fill .cage.std .sz, .fill .cage.std .mono, .fill .cage.std .empty { font-size: 13px; } .fill .led { width: 12px; height: 12px; }
.fill .tiles { flex: 2 1 auto; grid-auto-rows: 1fr; } .fill .tile { justify-content: center; gap: 10px; padding: 14px; } .fill .tile h3 { font-size: 15px; }
.fill .tile .big { font-size: 36px; } .fill .tile .big small { font-size: 16px; } .fill .big.nsecond { font-size: 22px; } .fill .big.nsecond small { font-size: 14px; } .fill .tile .bar { height: 16px; margin: 2px 0; } .fill .small { font-size: 14px; }
.fill .sline { font-size: 14px; padding: 9px 12px; }
.fill .pools { flex: 1.4 1 auto; grid-auto-rows: 1fr; } .fill .ptile { justify-content: center; gap: 9px; padding: 12px 14px; } .fill .pname { font-size: 17px; } .fill .pfree { font-size: 14px; } .fill .ptile .bar { height: 16px; }
}
.big.nsecond { font-size: 16px; } .big.nsecond small { font-size: 12px; }
.ptop { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; } .pname { font-size: 15px; overflow-wrap: anywhere; } .pfree { margin-left: auto; font-size: 13px; color: var(--nb-muted); white-space: nowrap; }
.ptile .bar { margin: 0; }
`;

class NasBaysCard extends HTMLElement {
  static getConfigElement() { return document.createElement("nas-bays-card-editor"); }
  static getStubConfig() { return {}; }
  setConfig(config) { this._cfg = { mode: "full", theme: "auto", ...config }; this._sig = null; if (this._hass) this._render(); }
  getCardSize() { return this._cfg?.mode === "compact" ? 3 : 10; }
  getGridOptions() { return this._cfg?.mode === "compact" ? { columns: 6, rows: "auto", min_columns: 4 } : { columns: "full", rows: "auto" }; }
  set hass(hass) { this._hass = hass; this._render(); }

  /* fill: stretch from where the card starts to the bottom of the screen. Measured, because dashboards differ. Not on phones, where it scrolls anyway. */
  _fit() {
    if (!this._cfg?.fill || this._cfg.mode === "compact" || window.innerWidth < 620) { this.style.removeProperty("--nb-fill-h"); return; }
    const top = this.getBoundingClientRect().top;
    if (top < 0) return;
    this.style.setProperty("--nb-fill-h", `${Math.max(0, window.innerHeight - top - (this._cfg.fill_bottom ?? 16))}px`);
  }

  disconnectedCallback() { if (this._onResize) window.removeEventListener("resize", this._onResize); this._onResize = null; }
  connectedCallback() {
    if (!this._onResize) { this._onResize = () => this._fit(); window.addEventListener("resize", this._onResize); }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.addEventListener("click", (e) => {
        const b = e.target.closest("[data-sel],[data-alerts]");
        if (!b) return;
        if (b.dataset.sel) this._sel = this._sel === b.dataset.sel ? "__none" : b.dataset.sel;
        if (b.dataset.alerts !== undefined) this._showAlerts = !this._showAlerts;
        this._render();
      });
    }
  }

  /* Standard layout: 12 bays across the top. TrueNAS can't see physical positions, so drives fill the bays in order
     unless the owner sets slots. A custom case layout (cages in YAML) replaces the row. */
  _layout(m) {
    const all = Object.values(m.disks);
    const cages = this._cfg.cages?.length ? this._cfg.cages : null;
    if (cages) {
      const placed = new Set(cages.flatMap((c) => c.slots || []).filter(Boolean));
      const rest = all.filter((d) => !placed.has(d.serial));
      return { cages, internal: rest.filter((d) => d.boot), unplaced: rest.filter((d) => !d.boot) };
    }
    const internal = all.filter((d) => d.boot), data = all.filter((d) => !d.boot);
    const count = Math.max(1, +this._cfg.bays || 12);
    let slots, unplaced = [];
    if (this._cfg.slots?.length) {
      slots = Array.from({ length: Math.max(count, this._cfg.slots.length) }, (_, i) => this._cfg.slots[i] ?? null);
      const placed = new Set(slots.filter(Boolean));
      unplaced = data.filter((d) => !placed.has(d.serial));
    } else {
      const list = data.sort((a, b) => !a.pool - !b.pool || String(a.pool ?? "").localeCompare(String(b.pool ?? "")) || a.serial.localeCompare(b.serial)).map((d) => d.serial);
      slots = [...list, ...Array(Math.max(0, count - list.length)).fill(null)];
    }
    return { cages: [{ standard: true, orientation: "vertical", slots }], internal, unplaced };
  }

  _tag(d) {
    if (d.boot) return t("boot");
    if (!d.pool) return t("none");
    return (this._cfg.pool_names || {})[d.pool] || d.pool;
  }

  _bay(serial, m, orient) {
    if (!serial) return this._std ? `<div class="empty">${EMPTY_BAY}<span class="elabel">${esc(t("empty"))}</span></div>` : `<div class="empty">${esc(t("empty"))}</div>`;
    const d = m.disks[serial], sel = this._current === serial ? " sel" : "";
    if (!d) {
      const off = m.offline;
      return `<button class="bay ${off ? "" : "gone"}${sel}" data-sel="${esc(serial)}" aria-label="${esc(serial)} ${esc(off ? t("no_data") : t("missing_l"))}">${orient === "vertical"
        ? `<span class="tag">${off ? "?" : esc(t("gone"))}</span><span class="vents"></span><span class="mono">${esc(serial.slice(-4))}</span>`
        : `<span class="tag">${esc(off ? t("no_data") : t("missing"))}</span><span class="vents"></span><span class="mono">${esc(serial.slice(-4))}</span>`}</button>`;
    }
    const icon = d.health === "ok" ? `<span class="led"></span>` : WARN_ICON;
    const hot = d.temperature != null && d.temperature >= (this._cfg.temp_warn ?? 50) ? " hot" : "";
    const temp = `<span class="t${hot}">${d.temperature == null ? "–" : Math.round(d.temperature) + "°"}</span>`;
    const label = t("drive_aria", { s: d.serial, t: d.temperature ?? t("unknown"), h: d.health === "ok" ? t("healthy_w") : t("attention_w") });
    const inner = orient === "vertical"
      ? `${icon}<span class="tag">${esc(this._tag(d))}</span>${this._std ? "" : `<span class="vents"></span>`}${temp}<span class="sz">${esc(decSize(d.size))}</span><span class="mono">${esc(d.serial.slice(-4))}</span>`
      : `${icon}${temp}<span class="vents"></span><span class="tag">${esc(this._tag(d))}</span><span class="sz">${esc(decSize(d.size))}</span><span class="mono">${esc(d.serial.slice(-4))}</span>`;
    return `<button class="bay ${d.health === "ok" ? "" : d.health}${sel}" data-sel="${esc(d.serial)}" aria-pressed="${!!sel}" aria-label="${esc(label)}">${inner}</button>`;
  }

  _strip(d, title) {
    const sel = this._current === d.serial ? " sel" : "";
    return `<button class="strip ${d.health === "ok" ? "" : d.health}${sel}" data-sel="${esc(d.serial)}" aria-pressed="${!!sel}">${d.health === "ok" ? `<span class="led"></span>` : WARN_ICON}<b>${esc(title)}</b><span class="sub">${esc(decSize(d.size))} · ${esc(this._tag(d))}</span><span class="t sp">${d.temperature == null ? "–" : Math.round(d.temperature) + "°"}</span><span class="mono">${esc(d.serial.slice(-4))}</span></button>`;
  }

  _detail(m) {
    const serial = this._current;
    if (!serial) return `<div class="detail"><span class="sub">${esc(t("tap_drive"))}</span></div>`;
    const d = m.disks[serial];
    if (!d) return `<div class="detail ${m.offline ? "" : "critical"}"><span class="ser">${esc(serial)}</span><span class="msg ${m.offline ? "" : "critical"}">${esc(m.offline ? t("no_data_nas") : t("not_reporting"))}</span></div>`;
    const pool = d.pool || t("not_in_pool");
    let msg;
    if (d.issues?.length) msg = d.issues.join(" ");
    else if (d.health === "ok") msg = d.pool ? t("healthy_errors", { r: d.read_errors, w: d.write_errors, c: d.checksum_errors }) : t("healthy_nopool");
    else msg = t("state_errors", { s: d.state || t("problem"), r: d.read_errors, w: d.write_errors, c: d.checksum_errors });
    return `<div class="detail ${d.health === "ok" ? "" : d.health}"><div class="title"><span class="ser">${esc(d.serial)}</span><span class="sub">${esc(d.model)} · ${esc(d.device)} · ${esc(pool)}</span></div><span class="msg ${d.health}">${esc(msg)}</span></div>`;
  }

  _full(m) {
    const { cages, internal, unplaced } = this._layout(m);
    this._std = !!cages[0]?.standard;
    const nic = (m.nics || [])[0] || {}, linkDown = nic.link && nic.link !== "LINK_STATE_UP";
    const upRate = rate(m.up), downRate = rate(m.down);
    const total = m.memTotal || (m.memApps ?? 0) + (m.memCache ?? 0) + (m.memFree ?? 0) || null;
    const stateClass = m.offline ? "s-off" : `s-${m.state}`;
    const pill = m.offline ? t("no_data") : summaryText(m);
    const sub = m.offline ? (m.since ? t("nothing_since", { t: m.since.toLocaleTimeString(LANG, { hour: "2-digit", minute: "2-digit" }) }) : t("waiting")) : [m.version && `TrueNAS ${m.version}`, m.cpuModel && m.cpuModel.replace(/ with .*/, "").replace(/^AMD |^Intel\(R\) /, ""), uptime(m.boot)].filter(Boolean).join(" · ");
    const apps = m.appsTotal ? [`<div class="chip"><b>${esc(t("x_of_y", { a: m.appsRunning, b: m.appsTotal }))}</b> ${esc(t("apps_running"))}</div>`] : [];
    const cfg = this._cfg;
    const lines = vpnLine(this._hass, cfg) + backupLine(m, cfg);
    return `
    <div class="head"><div class="who"><div class="host">${esc(this._cfg.name || m.host)}</div><div class="sub">${esc(sub)}</div></div>
      <div class="chips">${apps.join("")}
      ${m.alerts != null ? `<button class="chip ${m.alerts ? "warn" : ""}" data-alerts aria-expanded="${!!this._showAlerts}"><b>${m.alerts}</b> ${esc(t("alerts", { n: m.alerts }))}</button>` : ""}</div>
      <span class="pill ${stateClass}" role="status">${!m.offline && m.state !== "ok" ? WARN_ICON : ""}${esc(pill)}</span></div>
    ${this._showAlerts && m.alertList.length ? `<ul class="alerts">${m.alertList.map((a) => `<li>${esc(a.text)}</li>`).join("")}</ul>` : ""}
    <div class="chassis">
      <div class="cages">${cages.map((c) => {
        const o = c.orientation === "horizontal" ? "horizontal" : "vertical", slots = c.slots || [];
        if (c.standard) return `<div class="cage vertical std"><div class="slots" style="--c:${Math.min(slots.length, 12)}">${slots.map((s) => this._bay(s, m, o)).join("")}</div></div>`;
        return `<div class="cage ${o}"><div class="label">${esc(c.name || t("bays"))}</div><div class="slots" style="--n:${Math.max(slots.length, 1)}">${slots.map((s) => this._bay(s, m, o)).join("")}</div></div>`;
      }).join("")}</div>
      ${unplaced.length ? `<div class="label">${esc(t("not_placed"))}</div>${unplaced.map((d) => this._strip(d, d.serial)).join("")}` : ""}
      <div class="dock">${internal.map((d) => this._strip(d, t("internal"))).join("")}${this._detail(m)}</div>
    </div>
    <div class="tiles">
      ${shown(cfg, "cpu") ? `<div class="tile"><h3>CPU</h3><div class="big">${fmt(m.cpu, 0)}<small>%</small></div>
        <div class="bar" role="img" aria-label="${esc(t("cpu_aria", { n: fmt(m.cpu, 0) }))}"><i style="width:${Math.min(100, m.cpu || 0)}%;background:var(--nb-a)"></i></div>
        <div class="small">${m.temp != null ? `${fmt(m.temp, 0)}°C · ` : ""}${esc(t("load", { n: fmt(m.load, 2) }))}</div></div>` : ""}
      ${shown(cfg, "memory") ? `<div class="tile"><h3>${esc(t("memory"))}</h3><div class="big">${fmt(m.memApps)}<small> GiB</small></div>
        <div class="bar" role="img" aria-label="${esc(t("mem_aria", { t: fmt(total), a: fmt(m.memApps), c: fmt(m.memCache), f: fmt(m.memFree) }))}"><i style="width:${total ? ((m.memApps || 0) / total) * 100 : 0}%;background:var(--nb-a)"></i><i style="width:${total ? ((m.memCache || 0) / total) * 100 : 0}%;background:var(--nb-b)"></i></div>
        <div class="small">${esc(t("mem_line", { c: fmt(m.memCache), f: fmt(m.memFree), t: fmt(total) }))}</div></div>` : ""}
      ${shown(cfg, "network") ? `<div class="tile"><h3>${esc(t("network"))}${m.netSpeed ? ` · ${m.netSpeed >= 1000 ? `${m.netSpeed / 1000} Gb/s` : `${m.netSpeed} Mb/s`}` : ""}</h3><div class="big">${upRate[0]}<small> ${upRate[1]} ${esc(t("up"))}</small></div>
        <div class="big nsecond">${downRate[0]}<small> ${downRate[1]} ${esc(t("down"))}</small></div>
        ${linkDown ? `<div class="small warnword">${esc(t("link_down", { n: nic.name }))}</div>` : ""}</div>` : ""}
    </div>
    ${lines ? `<div class="slines">${lines}</div>` : ""}
    ${shown(cfg, "storage") ? `<div class="pools" aria-label="${esc(t("storage"))}">${Object.values(m.pools).map((p) => poolTile(p, cfg)).join("")}</div>` : ""}`;
  }

  _compact(m) {
    const { cages, internal, unplaced } = this._layout(m);
    const serials = [...cages.flatMap((c) => (c.slots || []).filter(Boolean)), ...unplaced.map((d) => d.serial), ...internal.map((d) => d.serial)];
    const bad = Object.values(m.disks).find((d) => d.issues?.length);
    const firstPool = Object.values(m.pools)[0];
    let msg, cls = "";
    if (m.offline) msg = m.since ? t("nothing_since", { t: m.since.toLocaleTimeString(LANG, { hour: "2-digit", minute: "2-digit" }) }) : t("waiting");
    else if (m.state !== "ok") { msg = bad ? bad.issues[0] : m.alertList[0]?.text || summaryText(m); cls = m.state; }
    else msg = [uptime(m.boot), m.appsTotal ? `${t("x_of_y", { a: m.appsRunning, b: m.appsTotal })} ${t("apps_running")}` : ""].filter(Boolean).join(" · ");
    return `<div class="head"><div class="who"><div class="host" style="font-size:20px">${esc(this._cfg.name || m.host)}</div></div><span class="pill ${m.offline ? "s-off" : `s-${m.state}`}">${esc(m.offline ? t("no_data") : summaryText(m))}</span></div>
      <div class="msg ${cls}">${esc(msg)}</div>
      <div class="leds" style="--n:${Math.max(serials.length, 1)}" role="img" aria-label="${esc(t("drives_aria", { n: serials.length }))}">${serials.map((s) => { const d = m.disks[s]; return `<i class="${m.offline ? "off" : !d ? "gone" : d.health === "ok" ? "" : d.health}"></i>`; }).join("")}</div>
      <div class="stats"><div><b>${fmt(m.cpu, 0)}%</b><span class="small">CPU</span></div><div><b>${fmt(m.memApps)} GiB</b><span class="small">${esc(t("apps_memory"))}</span></div><div><b>${firstPool ? fmt(firstPool.percent, 0) + "%" : "–"}</b><span class="small">${esc(t("pool_full", { p: firstPool ? firstPool.name : t("pool") }))}</span></div></div>`;
  }

  _render() {
    if (!this._hass || !this._cfg || !this.shadowRoot) return;
    pickLang(this._hass, this._cfg);
    const m = readModel(this._hass, this._cfg);
    this._model = m;
    if (m.host && !m.offline) this._lastHost = m.host;
    if (m.offline && this._lastHost) m.host = this._lastHost;
    const dark = this._cfg.theme === "dark" || (this._cfg.theme !== "light" && this._hass.themes?.darkMode);
    const wrap = `${dark ? "dark" : ""} ${this._cfg.theme === "dark" ? "force" : ""} ${this._cfg.fill && this._cfg.mode !== "compact" ? "fill" : ""}`;
    let body;
    if (m.missing) body = `<div class="msg">${t("add_integration")}</div>`;
    else {
      const list = Object.values(m.disks);
      const worst = list.find((d) => d.health === "critical") || list.find((d) => d.health === "warning");
      this._current = this._sel === "__none" ? null : this._sel || worst?.serial || null;
      body = this._cfg.mode === "compact" ? this._compact(m) : this._full(m);
    }
    if (body === this._sig) return;
    this._sig = body;
    /* The full card is designed for up to about 1100 px. On a wider screen it stays that size, centred, instead of stretching. 0 turns this off. */
    const widest = this._cfg.mode === "compact" ? 0 : parseInt(this._cfg.max_width ?? 1100, 10) || 0;
    const vars = [this._cfg.background && `--ha-card-background:${esc(this._cfg.background)};--card-background-color:${esc(this._cfg.background)}`, widest > 0 && `--nb-max:${widest}px`].filter(Boolean).join(";");
    const style = vars ? `style="${vars}"` : "";
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="${wrap}" ${style}><ha-card>${body}</ha-card></div>`;
    this._fit();
    if (!this._fitted) { this._fitted = true; requestAnimationFrame(() => this._fit()); setTimeout(() => this._fit(), 800); }
  }
}

const SECTIONS = () => [["cpu", "CPU"], ["memory", t("memory")], ["network", t("network")], ["vpn", t("e_vpn_line")], ["backups", t("e_backups_line")], ["storage", t("storage")]];

class NasBaysCardEditor extends HTMLElement {
  setConfig(config) { this._cfg = { ...config }; this._draw(); }
  set hass(hass) { const first = !this._hass; this._hass = hass; if (first) this._draw(); }
  _emit() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true })); this._draw(); }
  _disks() { return this._hass ? Object.values(readModel(this._hass, this._cfg).disks || {}) : []; }
  _draw() {
    if (!this._cfg) return;
    if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._wire(); }
    pickLang(this._hass, this._cfg);
    const disks = this._disks().filter((d) => !d.boot), custom = this._cfg.cages?.length > 0, count = Math.max(1, +this._cfg.bays || 12);
    const slots = this._cfg.slots || [], used = new Set(slots.filter(Boolean));
    const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;
    this.shadowRoot.innerHTML = `<style>
      :host{display:grid;gap:14px;color:var(--primary-text-color)} label{display:grid;gap:4px;font-size:14px} select,input{font:inherit;padding:8px;color:inherit;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:6px;min-width:0}
      .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px} fieldset{border:1px solid var(--divider-color);border-radius:8px;display:grid;gap:8px;padding:10px} legend{font-weight:600;padding:0 6px} .slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px} .checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px} label.check{display:flex;align-items:center;gap:6px} button{font:inherit;padding:8px 12px;border-radius:6px;border:1px solid var(--divider-color);background:none;color:inherit;cursor:pointer} p{margin:0;color:var(--secondary-text-color);font-size:13px}
    </style>
    <div class="row">
      <label for="mode">${esc(t("e_size"))}<select id="mode" data-key="mode">${opt("full", t("e_full"), this._cfg.mode || "full")}${opt("compact", t("e_compact"), this._cfg.mode || "full")}</select></label>
      <label for="theme">${esc(t("e_colours"))}<select id="theme" data-key="theme">${opt("auto", t("e_follow"), this._cfg.theme || "auto")}${opt("light", t("e_darktext"), this._cfg.theme || "auto")}${opt("dark", t("e_whitetext"), this._cfg.theme || "auto")}</select></label>
      <label for="lang">${esc(t("e_language"))}<select id="lang" data-key="language">${opt("", t("e_lang_auto"), this._cfg.language || "")}${Object.entries(LANG_NAMES).map(([k, n]) => opt(k, n, this._cfg.language || "")).join("")}</select></label>
    </div>
    <fieldset><legend>${esc(t("e_show"))}</legend><div class="checks">${SECTIONS().map(([k, label]) => `<label class="check"><input type="checkbox" data-hide="${k}" ${(this._cfg.hide || []).includes(k) ? "" : "checked"}> ${esc(label)}</label>`).join("")}</div></fieldset>
    <label class="check"><input type="checkbox" data-bool="fill" ${this._cfg.fill ? "checked" : ""}> ${esc(t("e_fill"))}</label>
    <label for="maxw">${esc(t("e_maxw"))}<input id="maxw" type="number" min="0" step="10" data-text="max_width" value="${esc(this._cfg.max_width ?? 1100)}"></label>
    <fieldset><legend>${esc(t("e_vpn_opt"))}</legend><p>${esc(t("e_vpn_help"))}</p>
      <div class="row"><label for="vpne">${esc(t("e_vpn_sensor"))}<input id="vpne" data-text="vpn_entity" value="${esc(this._cfg.vpn_entity || "")}" placeholder="sensor.nas_vpn"></label>
      <label for="vpnl">${esc(t("e_label"))}<input id="vpnl" data-text="vpn_label" value="${esc(this._cfg.vpn_label || "")}" placeholder="Proton WireGuard"></label></div></fieldset>
    ${custom ? `<p>${esc(t("e_custom"))}</p>` : `<fieldset><legend>${esc(t("e_bays_legend"))}</legend>
      <p>${esc(t("e_bays_help"))}</p>
      <label for="bays">${esc(t("e_bays_n"))}<input id="bays" type="number" min="1" max="60" data-num="bays" value="${count}"></label>
      <div class="slots">${Array.from({ length: Math.max(count, slots.length) }, (_, i) => { const s = slots[i] ?? null; return `<label for="b${i}">${esc(t("e_bay", { n: i + 1 }))}<select id="b${i}" data-slot="${i}"><option value="">${esc(slots.length ? t("empty") : t("e_auto"))}</option>${disks.filter((d) => d.serial === s || !used.has(d.serial)).map((d) => opt(d.serial, `${d.serial} (${decSize(d.size)}, ${d.pool || t("e_no_pool")})`, s)).join("")}${s && !disks.some((d) => d.serial === s) ? opt(s, `${s} (${t("missing_l")})`, s) : ""}</select></label>`; }).join("")}</div>
      ${slots.length ? `<button type="button" data-auto>${esc(t("e_auto_btn"))}</button>` : ""}</fieldset>`}`;
  }
  _wire() {
    const root = this.shadowRoot;
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.key) { this._cfg = { ...this._cfg, [t.dataset.key]: t.value }; if (!t.value) delete this._cfg[t.dataset.key]; }
      else if (t.dataset.bool) { this._cfg = { ...this._cfg }; if (t.checked) this._cfg[t.dataset.bool] = true; else delete this._cfg[t.dataset.bool]; }
      else if (t.dataset.hide) {
        const hide = new Set(this._cfg.hide || []);
        if (t.checked) hide.delete(t.dataset.hide); else hide.add(t.dataset.hide);
        this._cfg = { ...this._cfg, hide: [...hide] };
        if (!hide.size) delete this._cfg.hide;
      } else if (t.dataset.text) {
        this._cfg = { ...this._cfg, [t.dataset.text]: t.value.trim() };
        if (!this._cfg[t.dataset.text]) delete this._cfg[t.dataset.text];
      }
      else if (t.dataset.slot !== undefined) {
        const count = Math.max(1, +this._cfg.bays || 12), next = Array.from({ length: count }, (_, i) => (this._cfg.slots || [])[i] ?? null);
        next[+t.dataset.slot] = t.value || null;
        this._cfg = { ...this._cfg, slots: next };
        if (!next.some(Boolean)) delete this._cfg.slots;
      } else if (t.dataset.num) {
        const n = Math.min(60, Math.max(1, +t.value || 12));
        this._cfg = { ...this._cfg, [t.dataset.num]: n };
        if (this._cfg.slots) this._cfg.slots = Array.from({ length: n }, (_, i) => this._cfg.slots[i] ?? null);
        if (n === 12) delete this._cfg[t.dataset.num];
      }
      else return;
      this._emit();
    });
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.dataset.auto !== undefined) { this._cfg = { ...this._cfg }; delete this._cfg.slots; this._emit(); }
    });
  }
}

const register = (tag, cls) => { try { if (!customElements.get(tag)) customElements.define(tag, cls); } catch (err) { console.debug(`nas-bays: ${tag} already registered`, err); } };
/* The integration can load this file before HA's app has wrapped customElements. Anything defined before
   then is invisible to HA's customElements.get and the card shows "Configuration error", so wait for the app. */
const registerAll = () => { register("nas-bays-card", NasBaysCard); register("nas-bays-card-editor", NasBaysCardEditor); };
let tries = 0;
const whenAppReady = () => {
  if (customElements.get("home-assistant") || ++tries > 600) registerAll();
  else setTimeout(whenAppReady, 50);
};
whenAppReady();
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "nas-bays-card")) window.customCards.push({ type: "nas-bays-card", name: "NAS Bays", description: "Monitor a TrueNAS server: 12 drive bays, pools, CPU, memory and network. Read-only.", preview: false, documentationURL: "https://github.com/spikey1965/ha-nas-bays" });
console.info(`%c NAS-BAYS-CARD %c v${VERSION} `, "background:#1b6fb8;color:#fff", "");
})();
