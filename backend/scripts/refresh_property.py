import argparse
import requests
import sys

BASE_URL = "http://localhost:5000"
USERNAME = "consultor.eliezer"
PASSWORD = "@Epbaa090384!@#$"


def login() -> str:
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def refresh_property(property_id: int) -> dict:
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(
        f"{BASE_URL}/api/properties/{property_id}/refresh",
        headers=headers,
        timeout=30,
    )
    if resp.status_code == 404:
        print(resp.json())
        return {}
    resp.raise_for_status()
    return resp.json()


def main(argv=None):
    parser = argparse.ArgumentParser(description="Trigger manual refresh for a property")
    parser.add_argument("property_id", type=int, help="Internal property ID")
    args = parser.parse_args(argv)

    try:
        result = refresh_property(args.property_id)
    except requests.HTTPError as exc:
        print(f"HTTP error: {exc.response.status_code}")
        try:
            print(exc.response.json())
        except Exception:
            print(exc.response.text)
        return 1
    except Exception as exc:
        print(f"Error: {exc}")
        return 1

    if result:
        print(result)
    else:
        print("No result returned")
    return 0


if __name__ == "__main__":
    sys.exit(main())
