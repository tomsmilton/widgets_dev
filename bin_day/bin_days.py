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
        "a": os.getenv("ALEX_PROPERTY_ID")
    }
    
    if not any(property_ids.values()):
        print("Error: At least one property ID environment variable is required")
        exit(1)
    
    # Process each property
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

if __name__ == "__main__":
    main() 