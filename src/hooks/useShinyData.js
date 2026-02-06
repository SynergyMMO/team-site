export async function grabShinyData(playerName) {
  const results = [];

  async function fetchPage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const data = await response.json();

      data.shinies.forEach((shiny) => {
        results.push({
          encounter_count: shiny.encounter_count,
          encounter_method: shiny.encounter_method,
          date_caught: shiny.date_caught,
          variant: shiny.variant,
          nickname: shiny.nickname,
          ivs: shiny.ivs,
          nature: shiny.nature,
          pokemon_name: shiny.pokemon?.name,
        });
      });

      if (data.next_page_url) {
        await fetchPage(data.next_page_url);
      }
    } catch (error) {
      console.error("Error fetching shinies:", error);
    }
  }

  const initialUrl = `https://shinyboard.net/api/users/${playerName}/shinies?page=1`;
  await fetchPage(initialUrl);

  console.log("All shinies for", playerName, results);
  return results;
}