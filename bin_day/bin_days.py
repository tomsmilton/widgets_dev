import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os

def get_bin_days(property_id):
    url = f"https://wasteservices.sheffield.gov.uk/property/{property_id}"
    
    # Color configurations matching the HTML
    color_map = {
        'Black Bin': '#0a0a0a',
        'Blue Bin': '#125fc7',
        'Brown Bin': '#6b3c31'
    }

    # Headers to mimic a browser request
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the table containing bin information
        collection_dates = []
        services_table = soup.find('table', {'class': 'table'})
        
        if not services_table:
            print("HTML Structure:")
            print(soup.prettify()[:1000])  # Print first 1000 chars of HTML for debugging
            raise Exception("Could not find services table on the page")
            
        # Find all service rows (excluding detail message rows)
        service_rows = services_table.find_all('tr', class_=lambda x: x and 'service-id-' in x)
        
        if not service_rows:
            print("Found table but no service rows. Table contents:")
            print(services_table.prettify())
            raise Exception("No service rows found in the table")
        
        for row in service_rows:
            try:
                # Get bin color from the h4 tag
                bin_header = row.find('h4')
                if not bin_header:
                    print(f"Row without h4 tag: {row.prettify()}")
                    continue
                    
                bin_text = bin_header.get_text().strip()
                if not any(color in bin_text for color in ['Black', 'Blue', 'Brown']):
                    print(f"Row with unrecognized bin color: {bin_text}")
                    continue
                
                # Get next collections from the next-service cell
                next_service_cell = row.find('td', {'class': 'next-service'})
                if not next_service_cell:
                    print(f"Row without next-service cell: {row.prettify()}")
                    continue
                    
                dates_text = next_service_cell.get_text().strip()
                # Remove the "Next Collections" label and split by comma
                dates = [date.strip() for date in dates_text.replace('Next Collections', '').split(',') if date.strip()]
                
                if not dates:
                    print(f"Row with no dates found: {dates_text}")
                    continue
                
                # Get bin type/description from the acceptable-waste cell
                waste_type_cell = row.find_next_sibling('tr').find('td', {'class': 'acceptable-waste'})
                waste_type = waste_type_cell.get_text().strip().replace('What goes in my bin?', '').strip() if waste_type_cell else ''
                
                collection_dates.append({
                    "bin_color": bin_text,
                    "next_collections": dates,
                    "bin_type": waste_type
                })
                
            except Exception as e:
                print(f"Error processing row: {str(e)}")
                print(f"Problematic row HTML: {row.prettify()}")
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

    # Process Richmond property
    if richmond_property_id:
        print(f"Processing Richmond property...")
        data = get_richmond_bin_days(richmond_property_id)

        if data:
            save_to_file(data, "richmond_bin_days.json")
        else:
            print(f"Failed to get bin collection data for Richmond")

if __name__ == "__main__":
    main() 