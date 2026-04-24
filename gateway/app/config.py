import os

GATEWAY_ID = os.getenv("GATEWAY_ID", "GW-DEMO-001")
CUSTOMER_ID = os.getenv("CUSTOMER_ID", "CUSTOMER-DEMO")
SITE_ID = os.getenv("SITE_ID", "SITE-DEMO-001")

COMPANY_API_URL = os.getenv(
    "COMPANY_API_URL",
    "http://company-server:8000/api/ingest/gateway",
)

COMPANY_API_TOKEN = os.getenv("COMPANY_API_TOKEN", "demo-token")
EXPORT_INTERVAL_SECONDS = int(os.getenv("EXPORT_INTERVAL_SECONDS", "5"))
