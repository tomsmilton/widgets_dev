import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os

def get_bin_days(property_id):
    url = f"https://wasteservices.sheffield.gov.uk/property/{property_id}"
    
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
            raise Exception("Could not find services table on the page")
            
        # Find all service rows (excluding detail message rows)
        service_rows = services_table.find_all('tr', class_=lambda x: x and 'service-id-' in x)
        
        for row in service_rows:
            try:
                # Get bin color from the h4 tag
                bin_header = row.find('h4')
                if not bin_header:
                    continue
                    
                bin_text = bin_header.get_text().strip()
                if not any(color in bin_text for color in ['Black', 'Blue', 'Brown']):
                    continue
                
                # Get next collections from the next-service cell
                next_service_cell = row.find('td', {'class': 'next-service'})
                if not next_service_cell:
                    continue
                    
                dates_text = next_service_cell.get_text().strip()
                # Remove the "Next Collections" label and split by comma
                dates = [date.strip() for date in dates_text.replace('Next Collections', '').split(',') if date.strip()]
                
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
                continue
        
        if not collection_dates:
            raise Exception("No collection dates found")
            
        # Create data structure
        data = {
            "last_updated": datetime.now().isoformat(),
            "collections": collection_dates
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
    # Get property ID from environment variable
    property_id = os.getenv("PROPERTY_ID")
    
    if not property_id:
        print("Error: PROPERTY_ID environment variable is required")
        exit(1)
    
    # Get bin collection data
    data = get_bin_days(property_id)
    
    if data:
        save_to_file(data)
    else:
        print("Failed to get bin collection data")

if __name__ == "__main__":
    main() 