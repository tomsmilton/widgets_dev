import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os

def get_bin_days(property_id):
    # Sheffield's waste site (rebuilt mid-2025) exposes a JSON API; the old
    # /property/<id> HTML pages no longer exist. The property id is the
    # "pointId" used by the new site's property-search flow.
    url = "https://wasteservices.sheffield.gov.uk/api/getCollectionDays"

    # Color configurations matching the HTML
    color_map = {
        'Black Bin': '#0a0a0a',
        'Blue Bin': '#125fc7',
        'Brown Bin': '#6b3c31'
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Content-Type": "application/json",
        # The site sends this literal value when reCAPTCHA is not enabled
        "x-recaptcha-token": "BYPASS"
    }

    payload = {
        "pointId": str(property_id),
        "pointType": "PointAddress",
        "councilId": "1"
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        body = response.json()

        services = body.get('activeServices') or []
        if not services:
            print(f"API response had no activeServices: {json.dumps(body)[:500]}")
            raise Exception("No active services returned for this property")

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        collection_dates = []

        for service in services:
            bin_text = (service.get('serviceName') or '').strip()
            if not any(color in bin_text for color in ['Black', 'Blue', 'Brown']):
                print(f"Skipping unrecognized service: {bin_text}")
                continue

            dates = []
            for schedule in service.get('serviceSchedules') or []:
                date_str = schedule.get('currentScheduledDate') or schedule.get('originalScheduledDate')
                if not date_str:
                    continue
                try:
                    # e.g. "2026-08-17T00:00:00+01:00" - only the date part matters
                    collection_date = datetime.strptime(date_str[:10], '%Y-%m-%d')
                except ValueError:
                    print(f"Could not parse date: {date_str}")
                    continue
                # The API includes the previous (completed) collection too
                if collection_date < today:
                    continue
                dates.append(collection_date)

            if not dates:
                print(f"No upcoming dates for {bin_text}")
                continue

            # Same "2 Jun 2025" format the HTML pages have always parsed
            formatted = [d.strftime('%d %b %Y').lstrip('0') for d in sorted(dates)]

            # Strip any HTML tags from the description
            description = BeautifulSoup(service.get('serviceDescription') or '', 'html.parser').get_text().strip()

            collection_dates.append({
                "bin_color": bin_text,
                "next_collections": formatted,
                "bin_type": description
            })

        if not collection_dates:
            raise Exception("No collection dates found")

        # Find the next collection date and corresponding bin color
        today = datetime.now()
        next_bin = None
        next_date = None
        min_days = float('inf')

        for bin_info in collection_dates:
            for date_str in bin_info['next_collections']:
                collection_date = datetime.strptime(date_str, '%d %b %Y')
                days_difference = (collection_date - today).days
                
                if days_difference >= 0 and days_difference < min_days:
                    min_days = days_difference
                    next_bin = bin_info['bin_color']
                    next_date = collection_date
            
        # Create data structure
        data = {
            "last_updated": datetime.now().isoformat(),
            "collections": collection_dates,
            "next_color": color_map.get(next_bin, '#555555')  # Add the color code for the next bin
        }
        
        return data
        
    except Exception as e:
        print(f"Error fetching bin days: {str(e)}")
        return None

def get_richmond_bin_days(property_id):
    url = f"https://www.richmond.gov.uk/my_richmond?pid={property_id}#my_waste"

    # Color configurations for Richmond bins
    color_map = {
        'Glass, can, plastic and carton recycling': '#2d2d2d',  # Mixed recycling - lighter black
        'Paper and card recycling': '#2E86DE',  # Blue
        'Rubbish and food': '#0a0a0a',  # Black dustbins
        'Garden waste': '#27AE60',  # Green
        'Food waste': '#1B5E20'  # Slightly darker green
    }

    # Headers to mimic a browser request
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all h4 elements that represent bin types
        collection_dates = []

        # Look for the waste section - typically after an h2 with "Waste" in the title
        waste_headings = soup.find_all('h4')

        if not waste_headings:
            print("HTML Structure:")
            print(soup.prettify()[:1000])
            raise Exception("Could not find any h4 headings on the page")

        for heading in waste_headings:
            try:
                bin_type = heading.get_text().strip()

                # Skip if not one of our expected bin types
                if bin_type not in color_map:
                    continue

                # Find the next ul element after this heading
                dates_list = heading.find_next_sibling('ul')
                if not dates_list:
                    print(f"No dates list found for {bin_type}")
                    continue

                # Extract all date items
                dates = []
                for li in dates_list.find_all('li'):
                    date_text = li.get_text().strip()
                    # Skip entries that don't contain dates or contain "No collection"
                    if 'No collection' in date_text or 'booked' in date_text:
                        continue
                    # Try to parse the date
                    try:
                        # Richmond uses format like "Friday 2 January 2026"
                        # We need to convert it to a date we can parse
                        parsed_date = datetime.strptime(date_text, '%A %d %B %Y')
                        dates.append(parsed_date.strftime('%Y-%m-%d'))
                    except ValueError:
                        print(f"Could not parse date: {date_text}")
                        continue

                if dates:
                    collection_dates.append({
                        "bin_color": bin_type,
                        "next_collections": dates,
                        "bin_type": ""
                    })

            except Exception as e:
                print(f"Error processing bin type {heading.get_text()}: {str(e)}")
                continue

        if not collection_dates:
            raise Exception("No collection dates found")

        # Find the next collection date and corresponding bin color
        today = datetime.now()
        next_bin = None
        next_date = None
        min_days = float('inf')

        for bin_info in collection_dates:
            for date_str in bin_info['next_collections']:
                collection_date = datetime.strptime(date_str, '%Y-%m-%d')
                days_difference = (collection_date - today).days

                if days_difference >= 0 and days_difference < min_days:
                    min_days = days_difference
                    next_bin = bin_info['bin_color']
                    next_date = collection_date

        # Create data structure
        data = {
            "last_updated": datetime.now().isoformat(),
            "collections": collection_dates,
            "next_color": color_map.get(next_bin, '#555555')
        }

        return data

    except Exception as e:
        print(f"Error fetching Richmond bin days: {str(e)}")
        return None

def save_to_file(data, filename="bin_days.json"):
    try:
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Data successfully saved to {filename}")
    except Exception as e:
        print(f"Error saving data: {str(e)}")

def main():
    # Get property IDs from environment variables
    property_ids = {
        "flora": os.getenv("FLORA_PROPERTY_ID"),
        "alex": os.getenv("ALEX_PROPERTY_ID")
    }

    richmond_property_id = os.getenv("RICHMOND_PROPERTY_ID")

    if not any(property_ids.values()) and not richmond_property_id:
        print("Error: At least one property ID environment variable is required")
        exit(1)

    failures = []

    # Process Sheffield properties (Flora and Alex)
    for name, property_id in property_ids.items():
        if not property_id:
            print(f"Skipping {name} - no property ID provided")
            continue

        print(f"Processing {name}'s property...")
        data = get_bin_days(property_id)

        if data:
            save_to_file(data, f"{name}_bin_days.json")
        else:
            print(f"Failed to get bin collection data for {name}")
            failures.append(name)

    # Process Richmond property
    if richmond_property_id:
        print(f"Processing Richmond property...")
        data = get_richmond_bin_days(richmond_property_id)

        if data:
            save_to_file(data, "richmond_bin_days.json")
        else:
            print(f"Failed to get bin collection data for Richmond")
            failures.append("richmond")

    if failures:
        # Non-zero exit so the GitHub Action goes red instead of silently
        # succeeding while the published JSON goes stale (this is what
        # happened for over a year after Sheffield rebuilt their site).
        print(f"ERROR: failed to update: {', '.join(failures)}")
        exit(1)

if __name__ == "__main__":
    main() 