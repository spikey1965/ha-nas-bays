"""Constants for NAS Bays."""
DOMAIN = "nas_bays"
VERSION = "0.3.3"
CARD_URL = f"/{DOMAIN}/nas-bays-card.js"
CONF_VERIFY_SSL = "verify_ssl"
DEFAULT_PORT = 443
FAST_INTERVAL = 30  # seconds between cheap reads
SLOW_EVERY = 10  # slow reads run every Nth update (5 minutes)
