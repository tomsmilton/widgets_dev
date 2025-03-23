# Sheffield Bin Collection Days Tracker

This repository automatically tracks and updates bin collection days for a Sheffield property using the Sheffield City Council's waste services website.

## Setup

1. **Fork/Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/bin_day.git
   cd bin_day
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure GitHub Secret**
   - Go to your GitHub repository
   - Click on "Settings" > "Secrets and variables" > "Actions"
   - Click "New repository secret"
   - Name: `PROPERTY_ID`
   - Value: Your Sheffield property ID (found in the URL when viewing your bin collections)
   - Click "Add secret"

## How It Works

The script:
1. Fetches bin collection data from Sheffield Council's website
2. Extracts collection dates for each bin type (Black, Blue, Brown)
3. Saves the data to `bin_days.json`
4. Updates daily via GitHub Actions

## Running Locally

To run the script manually:

```bash
python bin_days.py
```

By default, it will use the property ID from your environment variable. Set it like this:

```bash
export PROPERTY_ID=your_property_id
python bin_days.py
```

## GitHub Actions

The script runs automatically:
- Every day at midnight (UTC)
- Can be triggered manually from the Actions tab

## Output Format

The script generates a `bin_days.json` file with this structure:

```json
{
  "last_updated": "2024-03-23T12:00:00.000000",
  "collections": [
    {
      "bin_color": "Black Bin",
      "next_collections": [
        "24 Mar 2025",
        "7 Apr 2025"
      ],
      "bin_type": "Non-recyclable waste"
    }
  ]
}
```

## Security Note

- Never commit your property ID directly to the repository
- Always use the GitHub secret for the property ID
- The `bin_days.json` file is git-ignored by default

## Dependencies

- Python 3.x
- requests
- beautifulsoup4
- python-dotenv 