# Pokédex & Pokémon Detail Pages - User Guide

## Table of Contents
- [Pokédex Page Guide](#pokédex-page-guide)
- [Pokémon Detail Page Guide](#pokémon-detail-page-guide)
- [Tips & Tricks](#tips--tricks)
- [Frequently Asked Questions](#frequently-asked-questions)

---

## Pokédex Page Guide

### Overview

The Pokédex page is your comprehensive hub for exploring, searching, and filtering Pokémon. Whether you're tracking shinies, looking for specific Pokémon in locations, or filtering by type and abilities, all tools are available on one page.

### Main Display Areas

#### 1. **Mode Selector** (Top Left)
Choose between two tracking modes:

**Shiny Mode** (Default)
- Shows Pokémon marked as caught in shiny form
- Displays which team members have caught each shiny
- Shows "Complete" checkmark when all team members have it
- Best for: Tracking team collection progress through evolution lines

**Living Dex Mode**
- Shows Pokémon caught in regular (non-shiny) form
- Best for: Tracking team complete collection progress, excluding evolution lines.
- 
To switch modes, click the toggle between "Shiny" and "Living Dex" buttons.

#### 2. **Search Bar** (Top Center)
Instantly search for Pokémon by name.

**How to Use:**
- Type any Pokémon name (case-insensitive)
- Results filter in real-time as you type
- Examples: "pikachu", "CHARMANDER", "bulbA"
- Partial matches work too: "chu" finds "pikachu"

**Search Tips:**
- Search clears when you select a new filter

#### 3. **Filter Panels** (Left Sidebar)

All filter panels work together - select multiple options across different panels to narrow results. You can combine all filters below:

##### **Encounter Type Filter**
Filter Pokémon by how common they are to find:
- **All Encounter Types** - Show everything (default)
- **Very Common** - Easily found Pokemon (appears frequently)
- **Common** - Standard encounters
- **Uncommon** - Less frequent encounters
- **Rare** - Difficult to find
- **Very Rare** - Extremely rare encounters
- **Fishing** - Only found by fishing
- **Horde** - Only found in hordes
- **Lure** - Only from lure encounters

**Example:** Select "Horde" to see only horde huntable Pokémon

##### **Tier (Rarity) Filter**
Filter by overall rarity tier:
- **Tier 0** - Very Common (Pidgey, Rattata, etc.)
- **Tier 1-3** - Common to Uncommon
- **Tier 4-5** - Rare
- **Tier 6** - Very Rare
- **Tier 7** - Legendary/Mythical (Mewtwo, Mew, Arceus, etc.)

**Use Case:** Want to hunt only for rare Pokémon? Select Tier 2-0


##### **Egg Group Filter**
Filter by breeding group:
- **Dragon** - Dragon Egg-Group Pokemon
- **Mineral** - Rock Egg-Group Pokemon
- **Flying** - Flying Egg-Group Pokemon
- ... etc

**Use Case:** "I need to breed Dragon-types" → Select Dragon egg group

##### **Type Filter**
Filter by Pokémon type(s):
- Select one or more types (Fire, Water, Electric, etc.)
- Pokémon matching ALL selected types will be shown
- **Example:** Select "Water" + "Flying" = shows only Water/Flying types like Pelipper

**Note:** Selecting multiple types uses AND logic (not OR)

##### **Move Filter**
Search for Pokémon by move name:
- Type move name in search box
- Example: "Eruption", "Surf", "Grass Knot"
- Searches Up to 4 Moves

**Tip:** If you don't remember exact name, partial match works

##### **Ability Filter**
Search for Pokémon by ability name:
- Type ability name in search box
- Example: "Swift Swim", "Intimidate", "Lightning Rod"
- Searches both regular and hidden abilities

**Tip:** If you don't remember exact name, partial match works

##### **Location Filter**
Filter Pokémon by where they're found:
- Type location name: "ROUTE 3 - Kanto", "FOREST - Johto"
- Format: **LOCATION - REGION**
- Must include both location and region for results

**Example Uses:**
- "ROUTE 3 - KANTO" shows all Pokémon on Route 3 in Kanto
- "FOREST" alone won't work - need region too
- Use AutoComplete in the input to quickly select desired routes

**How it auto-populates:** When you click a location card on a Pokémon Detail page, the Pokédex will automatically open with that location pre-filled!
For Example, if you click on Charmander, you can then click on the Route 3 card to quickly see the phases.


##### **Stat Minimums Filter**
Filter by base stats - set minimum values:
- **HP** - Hit Points
- **ATK** - Attack power
- **DEF** - Defense
- **SP.ATK** - Special Attack
- **SP.DEF** - Special Defense
- **SPD** - Speed

**How to Use:**
- Type minimum values in any stat field
- Leave blank to ignore that stat
- Example: Set ATK ≥ 100 to see strong physical attackers

**Color Coding of Stats:**
- 🔴 **Red** - Low stat (bad)
- 🟠 **Orange** - Below average
- 🟡 **Yellow** - Average
- 🟢 **Green** - High stat (good)

All These filters work side by side, meaning you can search for specific moves, types, base stats at the same time.

Unobtainable legendaries, such as Kyogre, are hidden as soon as you use a filter, unless the "Legendary" egg group is selected.

##### **Hide Complete Toggle**
When enabled in Synergy Data mode, hides Pokémon your team has already fully collected.

**Use:** Focus on what you still need to catch!

#### 4. **Synergy Data Toggle**
When enabled, shows only Pokémon relevant to your team members and hides unrelated data.

### Pokémon Results Display

#### Grid Layout
- Each Pokémon shown as a card/item
- Displays:
  - **GIF/Image** - Animated if available
  - **Name** - Pokémon name
  - **ID** - National Pokédex number
  - **Tier Badge** - Colored indicator of rarity (0-7)
  - **Type Badges** - Pokémon primary and secondary types
  - **Owner Badges** - Team members who have caught it (if applicable)

#### Clickable Results
- **Click any Pokémon GIF/name** to open detailed Pokémon info page
- Shows location info, stats, moves, ability details, and more

#### Filter Summary
At the top, see which filters are active:
- "5 Filters Applied" - Shows how many active filters
- Click filters to modify

### Keyboard Shortcuts (if available)
- **Ctrl+F or Cmd+F** - Browser search (searches visible results only)
- **Enter** after typing in search - Apply filter

---

## Pokémon Detail Page Guide

### Overview

The Pokémon Detail page shows comprehensive information about a single Pokémon. Access it by clicking any Pokémon from the Pokédex or by navigating to `/pokemon/{name}`.

### Page Sections (Top to Bottom)

#### 1. **Header**
- **Pokémon Name** - Large, centered title
- **Pokédex ID** - National Pokédex number (e.g., #025 for Pikachu)
- **"Unobtainable" Label** (if applicable) - Red badge if not available in-game
- **Back Button** - Arrow to return to previous page or Pokédex
- **Navigation Arrows** - Arrows to go to previouis or next pokedex number.

#### 2. **Basic Information Card**
Shows core Pokémon data:
- **Official Art** - Large sprite/image
- **Height** - in meters (m)
- **Weight** - in kilograms (kg)
- **Gender Ratio** - Visual breakdown of male/female distribution (if applicable)
- **Generation** - Generation it originates from

**Understanding Gender Ratio:**
- Blue bar = Male percentage
- Red bar = Female percentage
- "Genderless" = This Pokémon has no gender

#### 3. **Type & Ability Section**
- **Types** - Colored badges showing primary and secondary types
  - Click type badges to see other Pokémon of that type (if implemented)

**Abilities** 
- **Normal Ability** - Regular ability this Pokémon can have
- **Hidden Ability** - Special/rare ability (marked with ✨)

**How to Learn More About Abilities**
- **Hover Feature** - Move your mouse over any ability name to see a detailed information box explaining what that ability does in battle
  - The tooltip will appear above the ability name with a smooth fade-in animation
  - Example: Hovering over Pikachu's "Static" shows "Has a 30% chance of paralyzing on contact with the opposing Pokémon."
- **What's the difference?** Hidden abilities are rarer, can only be obtained through Alpha swarms or Mystery balls, can sometimes have better abilities locked behind them.

#### 4. **Base Stats Chart** 
Compares this Pokémon's stats to others:

**Stats Displayed:**
- **HP** - Health points
- **ATK** - Attack 
- **DEF** - Defense 
- **SP.ATK** - Special Attack 
- **SP.DEF** - Special Defense 
- **SPD** - Speed

**Color Coding:**
- 🔴 Red = Low stat (weak in this area)
- 🟡 Yellow = Average stat
- 🟢 Green = High stat (strong in this area)

**Reading the Bars:**
- Longer bar = Higher stat value
- Bars scale to max possible stat in game (~200)
- Numbers shown on the right

**Example:** Alakazam has high SP.ATK (green) but low DEF (red) - glass cannon!


#### 5. **Evolution Line**
Shows the complete evolution chain for this Pokémon:

**How to Read the Evolution Line:**
- **Top Pokémon** - The base form (unevolved Pokémon)
- **Arrows** - Show progression to the next evolution
- **Evolution Conditions** - Text below each Pokémon shows HOW it evolves
  - Examples: "Level Up at Level 16", "Use Item with Water Stone", "Trade holding King's Rock"
- **Multiple Paths** - Some Pokémon have split evolutions (labeled "Option A" and "Option B")
  - Example: Poliwag → Poliwhirl → Poliwrath (Option A) or Politoed (Option B)

**Understanding Evolution Types:**
- **Level Up at [Number]** - Evolves when reaching that level
- **Use Item** - Use a specific item (Stone, etc.) on the Pokémon
- **Trade** - Trade the Pokémon to someone
- **Trade + Item** - Trade while holding a specific item
- **Special Conditions** - Some Pokémon need happiness, location, or to know a specific move

**Interactive Features:**
- Click any Pokémon name in the evolution line to view its details
- Hover for a subtle highlight effect


#### 6. **Breeding Information**
- **Egg Groups** - Which egg groups this Pokémon belongs to
  - Determines which Pokémon it can breed with
  - Example: Both must share an Egg Group (or one must be Ditto)
- **Catch Rate Bar** - Visual indicator of how easy this Pokémon is to catch
  - Ranges from 1 (hardest) to 255 (easiest)
  - Color-coded: 🔴 Hard, 🟠 Moderate, 🟡 Easy, 🟢 Very Easy
  - **Hover for Details**: Move your mouse over the catch rate bar to see an interactive calculator
    - Shows catch chance percentage for different Pokéballs
    - Displays effectiveness of various conditions (100% HP, lowered HP, asleep)
    - Recommends the best catching method based on efficiency
    - Includes formula and turn count calculations
  - **Catch Rate Information Includes:**
    - Pokéball types: Pokéball, Great Ball, Ultra Ball, Dusk Ball, Timer Ball, Safari Ball
    - Conditions: 100% HP, 1% HP (lowered), Sleep variations
    - Best method: Automatically recommends most efficient ball + condition
    - Max wild level: Shows the highest level this Pokémon appears in the wild

**Understanding Catch Rates:**
- Catch rate 1-50: Very hard to catch (usually Legendary/Mythical)
- Catch rate 51-100: Moderate difficulty
- Catch rate 101-200: Easy to catch
- Catch rate 201-255: Very easy to catch (common Pokémon)


#### 8. **Locations** 🎯
Shows where to find this Pokémon in the game:

**Location Card Details:**
- **Location Name** - Route or area (e.g., "ROUTE 3")
- **Region** - Which region (e.g., "Kanto")
- **Level Range** - Min-Max level when encountered
- **Rarity** - How common (Common, Uncommon, Rare, etc.)
- **Time** - When available (Morning, Day, Night, All)
- **Habitat** - Encounter type (Grass, Water, Fishing, Headbutt, Horde, etc.)

**🎯 Click Any Location Card:**
- Automatically opens Pokédex
- Pre-filters by that location
- Shows all Pokémon at that route
- **Perfect for:** "What Pokémon are on Route 3?"

**Location Search Format:**
- Must include location AND region
- Example: "ROUTE 3 - Kanto" (NOT just "ROUTE 3")

#### 9. **Learnable Moves**
Lists moves this Pokémon can learn:

**Move Columns:**
- **Move Name** - Attack/ability name
- **Type** - Colored badge (Fire, Water, Electric, etc.)
- **Category** - Physical, Special, or Status
  - Physical = Uses Attack stat
  - Special = Uses Sp.Atk stat
  - Status = No damage, utility effects
- **Power** - Base damage (higher = more damage)
- **Accuracy** - Hit percentage (100% = never misses)
- **Level** - At what level Pokémon learns this move
- **Method** - How learned (Level up, TM/HM, Breeding, Tutor, etc.)

**Reading Example:**
- "Pikachu learns Thunderbolt via TM at any level"
- "Pikachu learns Thundershock naturally at Level 1"

#### 10. **Shiny Status** (if applicable)
Shows which team members have caught this Pokémon as a shiny:
- Displays player names/avatars
- Shows count if multiple caught
- Example: "PlayerA (3 shinies), PlayerB (1 shiny)"

---

## Tips & Tricks

### Pokédex Pro Tips

**1. Narrow Down Quickly**
- Start with type filter (Fire, Water, etc.)
- Add location filter if hunting
- Add tier filter for difficulty level
- Combine: Gen 1 + Fire type + Rare = Specific Pokémon subset

**2. Finding "Specific" Pokémon**
- Know the location? Use location filter
- Know the type? Use type filter
- Know the name? Use search bar
- Know nothing? Use tier filter to narrow by difficulty

**3. Location Hunting**
- Use location filter: "ROUTE 3 - Kanto"
- Shows all Pokémon available there
- Sort by rarity to see easiest catches first

**4. Breeding Preparation**
- Use egg group filter
- See all Pokémon you can breed with
- Check compatibility before catching

**5. Team Building**
- Filter by type to build balanced team
- Use stats filter to find strong stats
- Combine with Gen filter to plan evolution strategies

### Mobile Users - Filter Menu Guide

**1. Accessing Filters on Phone (≤600px width)**
- Look for the **hamburger menu button** (☰) at the top of the page
- Tap it to reveal the filter buttons
- Tap again to hide and free up screen space
- Menu automatically closes when you resize browser to desktop size

**2. Using Dropdown Menus on Mobile**
- Dropdowns use a **2-column layout** to fit all options on screen
- Scroll within dropdown to see all choices
- Dropdowns open at the bottom to avoid covering other content
- Click outside the menu or on another filter to close
- All your selections are saved when menu is closed

**3. Mobile Tips**
- Filters take up less space when closed - great for viewing Pokémon
- Use portrait orientation for best mobile experience
- All filter types work the same on mobile and desktop

### Pokémon Detail Pro Tips

**1. Navigation**
- Back button remembers previous page
- Share Pokémon link with friends: `/pokemon/pikachu`
- Bookmark favorite Pokémon

**2. Understanding Location Data**
- Each location lists all encounter types
- Click location to see other Pokémon there
- "Horde" = Multiple Pokémon in one battle
- "Fishing" = Requires fishing rod

**3. Move Analysis**
- Sort moves by level to see natural progression
- High power + high accuracy = best moves
- Status moves (like Thunder Wave) useful even with 0 power

**4. Evolution Planning**
- Check evolution requirements before catching
- Some evolve at specific levels
- Some need stones or friendship - plan accordingly

**5. Optimal Stat Combinations**
- Pikachu line: Best SP.ATK, low DEF = Special sweeper role
- Onix: High DEF, low SP.DEF = Physical wall
- Alakazam: High SPD + SP.ATK = Lead/Sweeper

---

## Frequently Asked Questions

### General Questions

**Q: What's the difference between Shiny and Living Dex modes?**
A: Shiny = Shows caught shinies, once a shiny is caught it fills in the remaining evolution line, for example when Charmander is caught, so is Charmeleon and Charizard.. Living Dex = All pokedex IDs must be obtained and in a team members box, for example, catching Squirtle does not complete Wartortle or lastoise.

**Q: Why can't I find a Pokémon?**
A: Check if it's:
1. In the correct region/generation
2. Available in PokeMMO (some Pokémon might be unobtainable)
3. Spelled correctly in search
4. Behind a tier filter set too high
If none of these are the case, please contact Hyper on discord.

### Pokédex Questions

**Q: Can I combine multiple filters?**
A: Yes! All filters work together. Select Type + Location + Rarity all at once for precise results.

**Q: Why does my search result keep resetting?**
A: Pokédex clears search when you apply filters. This is intentional to show full filter results. Just re-search if needed.

**Q: Can I export or print the filtered results?**
A: Not built-in, but you can screenshot or use browser's print function (Ctrl+P).

### Pokémon Detail Questions

**Q: What do the stat colors mean?**
A:
- Red = Low compared to other Pokémon (weak stat)
- Green = High compared to other Pokémon (strong stat)
- Scale goes from 0-255; most are 20-150

**Q: How do I use this location info?**
A: Note the location, level range, and time. Go to that place in-game at that time and search for the Pokémon.

**Q: Can I click on moves to learn more?**
A: Not in this version, but move database included in detail (Power, Accuracy, Category visible).

**Q: What's the difference between ability and hidden ability?**
A: Pokémon normally have one of two abilities. Hidden ability is rarer and often more powerful/useful. Hidden abilities often available through special encounters (Friend Safari, Max. Raid Battles, etc.)

### Location Questions

**Q: Why do some locations show multiple Pokémon?**
A: Routes typically have 5-10 Pokémon that spawn randomly. Location card shows where to find a specific one.

**Q: What does "Horde" mean?**
A: Engage Multiple Pokémon at once. Useful for grinding levels or shiny hunting

**Q: What does "Fishing" mean?**
A: Use fishing rod. Different rods sometimes show different Pokémon (Old Rod, Good Rod, Super Rod).

**Q: I can't find the Pokémon at the location shown.**
A: Check:
1. Correct time of day (if listed)
2. Correct region/version of game
3. Correct level (it might only appear in high/low level areas)
4. Wrong Pokémon form (it might need specific condition to appear)

### Technical Questions

**Q: Does the page work on mobile?**
A: Yes! The Pokédex is fully mobile-optimized:

- **Filters on phones (≤600px)**: Hidden behind a hamburger menu (☰) button to save screen space
- **Opening filters**: Tap the hamburger button to expand/collapse the filter menu
- **Dropdown menus**: Automatically arranged in 2-column layout on mobile for better visibility
- **Menu positioning**: Dropdowns appear at the bottom of screen to prevent covering Pokémon content
- **Auto-close**: Menu closes when clicking outside or when resizing to desktop size
- **No data loss**: All filter selections are preserved while menu is closed

See [Mobile Users - Filter Menu Guide](#mobile-users---filter-menu-guide) above for detailed instructions.

**Q: Can I access this page offline?**
A: No, page requires internet to fetch Pokémon data from servers.

**Q: Why is the page slow to load?**
A: First load fetches Pokémon database. Refresh or filter to load faster (data cached).
1. Future loads may be faster due to image caching on first load.

**Q: Is there dark mode?**
A: Page uses dark theme by default. Browser dark mode extensions might also work.

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| Ctrl+F (Cmd+F on Mac) | Browser search in visible results |
| Ctrl+L (Cmd+L on Mac) | Focus location filter |
| Backspace | Back button (when not in text field) |
| / | Quick search (if implemented) |

---

## Need Help?

- **Bug Report:** Contact ohypers on discord
- **Suggestion:** Contact ohypers on discord
- **Pokémon Data Question:** Contact ohypers on discord
- **Location Help:** Check in-game PokeDex

---

**Last Updated:** February 11, 2026  
**Version:** 2.0  
**Compatible with:** All modern browsers, mobile devices
