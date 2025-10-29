import requests
import json

BASE_URL = "http://localhost:5000"
USERNAME = "consultor.eliezer"
PASSWORD = "@Epbaa090384!@#$"

response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"username": USERNAME, "password": PASSWORD},
    timeout=10,
)

print(f"Status: {response.status_code}")
try:
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    if response.ok:
        print(f"\nACCESS_TOKEN={data.get('access_token')}")
except ValueError:
    print(response.text)
