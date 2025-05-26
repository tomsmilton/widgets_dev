import os
import pandas as pd
import matplotlib.pyplot as plt
import re
from datetime import datetime
import numpy as np

def parse_filename(filename):
    """Parse filename to extract Person, Mask, and Action"""
    match = re.match(r'([^_]+)_([^._]+)\._Action_([^.]+)\.csv', filename)
    if match:
        return match.groups()
    return None, None, None

def time_to_seconds(time_str):
    """Convert time string (HH:MM:SS) to seconds from start"""
    try:
        time_obj = datetime.strptime(time_str, '%H:%M:%S')
        return time_obj.hour * 3600 + time_obj.minute * 60 + time_obj.second
    except:
        return None

def get_user_selection(prompt, options):
    """Get user selection from a list of options"""
    print(f"\n{prompt}")
    print(f"Available options: {', '.join(sorted(options))}")
    print("Enter your selection (comma-separated, or 'all' for all, 'none' to skip):")
    
    response = input("> ").strip().lower()
    
    if response == 'all':
        return options
    elif response == 'none' or response == '':
        return set()
    else:
        # Create a case-insensitive mapping
        options_lower = {opt.lower(): opt for opt in options}
        
        # Parse comma-separated input
        selections = set()
        for item in response.split(','):
            item_clean = item.strip().lower()
            if item_clean in options_lower:
                selections.add(options_lower[item_clean])
            else:
                print(f"Warning: '{item.strip()}' not found in options, skipping...")
        return selections

def plot_fit_factors(selected_files):
    """Plot Fit Factor data from selected CSV files"""
    if not selected_files:
        print("No files to plot!")
        return
    
    print("\nProcessing files...")
    
    plt.figure(figsize=(12, 8))
    
    # Use a colormap with enough distinct colors
    colors = plt.cm.tab20(range(len(selected_files)))
    
    successful_plots = 0
    
    for i, (filepath, person, mask, action) in enumerate(selected_files):
        try:
            # Read CSV
            df = pd.read_csv(filepath)
            
            # Check if required columns exist
            if 'Time' not in df.columns or 'FitFactor' not in df.columns:
                print(f"Warning: {os.path.basename(filepath)} missing required columns")
                continue
            
            # Convert time to seconds
            df['Seconds'] = df['Time'].apply(time_to_seconds)
            
            # Remove rows with invalid time or fit factor
            df = df.dropna(subset=['Seconds', 'FitFactor'])
            
            # Remove zero or negative fit factors for log scale
            df = df[df['FitFactor'] > 0]
            
            # Calculate relative time (seconds from start)
            if len(df) > 0:
                start_time = df['Seconds'].min()
                df['Relative_Seconds'] = df['Seconds'] - start_time
                
                # Calculate average fit factor (both arithmetic and geometric mean)
                avg_fit_factor = df['FitFactor'].mean()
                geom_mean_fit_factor = np.exp(np.log(df['FitFactor']).mean())
                
                # Plot with average in label
                label = f"{person}_{mask}_{action} (avg: {avg_fit_factor:.1f}, gm: {geom_mean_fit_factor:.1f})"
                plt.semilogy(df['Relative_Seconds'], df['FitFactor'], 
                           label=label, color=colors[i % 20], 
                           marker='o', markersize=3, linewidth=1.5, alpha=0.8)
                successful_plots += 1
                print(f"  Plotted: {person}_{mask}_{action} - Avg: {avg_fit_factor:.1f}, Geom Mean: {geom_mean_fit_factor:.1f}")
        
        except Exception as e:
            print(f"Error processing {os.path.basename(filepath)}: {e}")
    
    if successful_plots == 0:
        print("No data could be plotted!")
        plt.close()
        return
    
    plt.xlabel('Time (s)', fontsize=12)
    plt.ylabel('Fit Factor', fontsize=12)
    plt.title('Fit Factor vs Time', fontsize=14)
    
    # Adjust legend position and size
    if successful_plots <= 10:
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=9)
    elif successful_plots <= 20:
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
    else:
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=7, ncol=2)
    
    plt.grid(True, alpha=0.3, which='both')
    plt.tight_layout()
    
    print(f"\nSuccessfully plotted {successful_plots} files")
    plt.show()

def main():
    # Get all CSV files from Data folder
    data_folder = 'Data'
    
    if not os.path.exists(data_folder):
        print(f"Error: '{data_folder}' folder not found!")
        print(f"Current directory: {os.getcwd()}")
        print("Please create a 'Data' folder and place your CSV files there.")
        return
    
    # Scan for CSV files and extract unique values
    csv_files = []
    people = set()
    masks = set()
    actions = set()
    
    print("\nScanning Data folder...")
    
    for filename in sorted(os.listdir(data_folder)):
        if filename.endswith('.csv'):
            person, mask, action = parse_filename(filename)
            if person and mask and action:
                filepath = os.path.join(data_folder, filename)
                csv_files.append((filepath, person, mask, action))
                people.add(person)
                masks.add(mask)
                actions.add(action)
    
    if not csv_files:
        print("No CSV files found matching the pattern!")
        return
    
    print(f"\nFound {len(csv_files)} CSV files")
    print(f"People: {', '.join(sorted(people))}")
    print(f"Masks: {', '.join(sorted(masks))}")
    print(f"Actions: {', '.join(sorted(actions))}")
    
    # Get user selections
    print("\n" + "="*50)
    print("SELECT FILES TO PLOT")
    print("="*50)
    
    selected_people = get_user_selection("Which PEOPLE do you want to plot?", people)
    if not selected_people:
        print("No people selected. Exiting.")
        return
    
    selected_masks = get_user_selection("Which MASKS do you want to plot?", masks)
    if not selected_masks:
        print("No masks selected. Exiting.")
        return
    
    selected_actions = get_user_selection("Which ACTIONS do you want to plot?", actions)
    if not selected_actions:
        print("No actions selected. Exiting.")
        return
    
    # Filter files based on selections
    selected_files = []
    for filepath, person, mask, action in csv_files:
        if (person in selected_people and 
            mask in selected_masks and 
            action in selected_actions):
            selected_files.append((filepath, person, mask, action))
    
    print(f"\n{len(selected_files)} files match your selection:")
    if len(selected_files) <= 20:
        for _, person, mask, action in selected_files:
            print(f"  - {person}_{mask}_{action}")
    else:
        # Show first 10 and last 5 if too many
        for _, person, mask, action in selected_files[:10]:
            print(f"  - {person}_{mask}_{action}")
        print(f"  ... and {len(selected_files) - 15} more ...")
        for _, person, mask, action in selected_files[-5:]:
            print(f"  - {person}_{mask}_{action}")
    
    # Confirm before plotting
    print("\nProceed with plotting? (y/n)")
    confirm = input("> ").strip().lower()
    
    if confirm in ['y', 'yes']:
        plot_fit_factors(selected_files)
    else:
        print("Plotting cancelled.")

if __name__ == "__main__":
    main()