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
- Best for: Tracking team collection progress

**Living Dex Mode**
- Shows Pokémon caught in regular (non-shiny) form
- Useful for: Completing standard Pokédex entries

To switch modes, click the toggle between "Shiny" and "Living Dex" buttons.

#### 2. **Search Bar** (Top Center)
Instantly search for Pokémon by name.

**How to Use:**
- Type any Pokémon name (case-insensitive)
- Results filter in real-time as you type
- Examples: "pikachu", "CHARMANDER", "bulbA"
- Partial matches work too: "chu" finds "pikachu"

**Search Tips:**
- Works with alternate forms: "rotom-heat", "darmanitan-zen"
- Search clears when you select a new filter

#### 3. **Filter Panels** (Left Sidebar)

All filter panels work together - select multiple options across different panels to narrow results. You can combine all filters below:

##### **Encounter Rarity Filter**
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

**Example:** Select "Very Rare" to see only challenging Pokémon

##### **Type Filter**
Filter by Pokémon type(s):
- Select one or more types (Fire, Water, Electric, etc.)
- Pokémon matching ALL selected types will be shown
- **Example:** Select "Water" + "Flying" = shows only Water/Flying types like Pelipper

**Note:** Selecting multiple types uses AND logic (not OR)

##### **Tier (Rarity) Filter**
Filter by overall rarity tier:
- **Tier 0** - Very Common (Pidgey, Rattata, etc.)
- **Tier 1-3** - Common to Uncommon
- **Tier 4-5** - Rare
- **Tier 6** - Very Rare
- **Tier 7** - Legendary/Mythical (Mewtwo, Mew, Arceus, etc.)

**Use Case:** Want to hunt only for rare Pokémon? Select Tier 6-7

##### **Egg Group Filter**
Filter by breeding group:
- **Dragon** - Dragon-type eggs
- **Amorphous** - Blob-like creatures
- **Mineral** - Rock-like Pokémon
- **Flying** - Flying-type egg group
- ... and more

**Use Case:** "I need to breed Dragon-types" → Select Dragon egg group

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

**How it auto-populates:** When you click a location card on a Pokémon Detail page, the Pokédex will automatically open with that location pre-filled!

##### **Generation Filter**
Filter by Pokémon generation:
- **Gen 1** - Original 151 (Kanto region)
- **Gen 2** - Gold/Silver/Crystal additions (Johto)
- **Gen 3-7** - Later generations
- Select multiple generations to see evolution lines across generations

**Example:** Select "Gen 1" to see only original Pokémon

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

#### 2. **Basic Information Card**
Shows core Pokémon data:
- **Official Art** - Large sprite/image
- **Height** - in meters (m)
- **Weight** - in kilograms (kg)
- **Gender Ratio** - Visual breakdown of male/female distribution (if applicable)

**Understanding Gender Ratio:**
- Blue bar = Male percentage
- Red bar = Female percentage
- "Genderless" = This Pokémon has no gender

#### 3. **Type & Ability Section**
- **Types** - Colored badges showing primary and secondary types
  - Click type badges to see other Pokémon of that type (if implemented)
- **Normal Ability** - Regular ability this Pokémon can have
- **Hidden Ability** - Special/rare ability (marked with ⭐)

**What do abilities do?** Passive effects in battle
- Example: Pikachu's "Static" paralyzes on contact

#### 4. **Base Stats Chart** 
Compares this Pokémon's stats to others:

**Stats Displayed:**
- **HP** - Health points
- **ATK** - Attack (physical damage)
- **DEF** - Defense (physical resistance)
- **SP.ATK** - Special Attack (special move damage)
- **SP.DEF** - Special Defense (special resistance)
- **SPD** - Speed (who goes first in battle)

**Color Coding:**
- 🔴 Red = Low stat (weak in this area)
- 🟡 Yellow = Average stat
- 🟢 Green = High stat (strong in this area)

**Reading the Bars:**
- Longer bar = Higher stat value
- Bars scale to max possible stat in game (~200)
- Numbers shown on the right

**Example:** Alakazam has high SP.ATK (green) but low DEF (red) - glass cannon!

#### 5. **Description/Pokédex Entry**
- Official Pokédex flavor text
- Usually 1-2 sentences describing the Pokémon in-game
- Changes between generations (scroll to see variants if available)

**Fun Fact:** Some entries are weird or funny - read them!

#### 6. **Breeding Information**
- **Egg Groups** - Which egg groups this Pokémon belongs to
  - Determines which Pokémon it can breed with
  - Example: Both must share an Egg Group (or one must be Ditto)
- **Hatch Counter** - Egg cycles needed to hatch
  - Lower = Faster to breed
  - One cycle ≈ 255 steps in some games

#### 7. **Evolution Line**
If this Pokémon evolves or is evolved:
- Shows full evolution chain
- Click alternate forms to view them
- Example: Charmander → Charmeleon → Charizard

**Understanding Evolution Methods:**
- **Level** - Evolves at specific level (e.g., "Level 16")
- **Stone** - Needs stone item (Fire Stone, etc.)
- **Trade** - Needs to be traded to another player
- **Friendship** - Needs high friendship/happiness

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
A: Shiny = Rare color variants. Living Dex = Regular color forms. Switch modes to track which you need.

**Q: Why can't I find a Pokémon?**
A: Check if it's:
1. In the correct region/generation
2. Available in PokeMMO (some Pokémon might be unobtainable)
3. Spelled correctly in search
4. Behind a tier filter set too high

**Q: How do I get a specific Pokémon?**
A:
1. Find it on Pokédex via location filter
2. Go to that location in-game
3. Note the level range and rarity
4. Catch it following the encounter details shown

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
A: Engage Multiple Pokémon at once. Useful for grinding levels or catching/training multiple at once.

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
A: Yes! All features are mobile-responsive. Filters move to dropdown on smaller screens.

**Q: Can I access this page offline?**
A: No, page requires internet to fetch Pokémon data from servers.

**Q: Why is the page slow to load?**
A: First load fetches Pokémon database. Refresh or filter to load faster (data cached).

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

- **Bug Report:** Click report button (if available) or contact support
- **Suggestion:** Send feedback through contact form
- **Pokémon Data Question:** Cross-reference official PokéAPI
- **Location Help:** Check in-game guidebook or online wiki

---

**Last Updated:** February 11, 2026  
**Version:** 2.0  
**Compatible with:** All modern browsers, mobile devices
