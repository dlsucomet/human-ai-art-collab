import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const OPENAIMODEL = "gpt-4.1-2025-04-14"

let openaiClient = null;

/**
 * Lazy initialization of OpenAI client.
 * Only initializes when an OpenAI function is actually called.
 * Throws error if OPENAI_API_KEY is not configured.
 * 
 * @returns {OpenAI} - The OpenAI client instance
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Please set the OPENAI_API_KEY environment variable to use OpenAI features.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

export async function extractKeywords (captions) {
    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: OPENAIMODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "Extract key elements from descriptive sentences of illustrations for categorization into three areas: \"Subject matter,\" \"Action & pose,\" and \"Theme & mood.\"\n\n- **Subject matter**: Extract specific, visually identifiable nouns or noun phrases, including compound objects and descriptive pairings (e.g., “colorful objects,” “red and orange background”). Favor phrases over single-word nouns when appropriate. Avoid reducing meaningful descriptors to general nouns.\n\n- **Action & pose**: Identify any clearly implied actions or poses performed by subjects. Use the base form (e.g., “reading,” “riding”) or descriptive phrases. If no actions are present, list should be empty.\n\n- **Theme & mood**: Use adjectives, abstract nouns, or adverbs that capture the overall emotion, setting, purpose, or cultural context. Favor concise, meaningful words and omit style terms.\n\nExclude variations like plurals and style descriptors (e.g., cartoon, illustration). Use root forms of words only.\n\n# Steps\n\n1. Review the provided sentences or descriptions.\n2. Extract nouns for \"Subject matter.\"\n3. Determine actions or poses for \"Action & pose.\"\n4. Choose relevant adjectives or adverbs for \"Theme & mood.\"\n5. Eliminate style descriptors and apply root forms where necessary.\n\n# Output Format\n\nStructure the output as a JSON object with distinct keys for each category: \"Subject matter,\" \"Action & pose,\" and \"Theme & mood.\"\n\n# Examples\n\n**User Input:**  \n```json\n{\n  \"Caption\": [\n    \"An old man is reading a book at a kitchen table.\",\n    \"Mountains are covered in snow under a cloudy sky.\",\n    \"A dog is lying casually beside a fireplace.\"\n  ]\n}\n```\n\n**Assistant Output:**  \n```json\n{\n  \"Subject matter\": [\"old man\", \"book\", \"kitchen table\", \"mountains\", \"snow\", \"cloudy sky\", \"dog\", \"rug\", \"fireplace\"],\n  \"Action & pose\": [\"reading a book\", \"lying casually\"],\n  \"Theme & mood\": [\"cozy\", \"serene\"]\n}\n```\n\n**User Input:**  \n```json\n{\n  \"Caption\": [\n    \"A firefighter sprays water on a burning house.\",\n    \"A crowd watches a parade from the sidewalk.\",\n    \"A boy rides a bicycle through the rain.\"\n  ]\n}\n```\n\n**Assistant Output:**  \n```json\n{\n  \"Subject matter\": [\"firefighter\", \"water\", \"burning house\", \"crowd\", \"parade\", \"sidewalk\", \"boy\", \"bicycle\", \"rain\"],\n  \"Action & pose\": [\"spraying water\", \"watching a parade\", \"riding a bicycle\"],\n  \"Theme & mood\": [\"urgent\", \"lively\", \"adventurous\"]\n}\n```\n\n**User Input:**  \n```json\n{\n  \"Caption\": [\n    \"A painting of a stone cottage surrounded by lavender fields.\",\n    \"An image of a lighthouse on a cliff overlooking the sea.\",\n    \"A sketch of a bridge crossing a quiet river in autumn.\",\n    \"A photo of a barn with haystacks nearby under a cloudy sky.\"\n  ]\n}\n```\n**Assistant Output:**  \n```json\n{\n  \"Subject matter\": [\"stone cottage\", \"lavender fields\", \"lighthouse\", \"cliff\", \"sea\", \"bridge\", \"river\", \"autumn\", \"barn\", \"haystacks\", \"sky\"],\n  \"Action & pose\": [],\n  \"Theme & mood\": [\"serene\", \"rural\", \"natural\"]\n}\n```\n\n# Notes\n\n- Focus on visible elements and actions, especially in sentences with abstract descriptors that may not directly map to visible objects or actions."
        }
          ]
        },
        {
          role: "user",
          content: captions
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      },
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });

    return JSON.parse(response.output_text);;
}

export async function recommendKeywords (data) {
     const openai = getOpenAIClient();
     const response = await openai.responses.create({
      model: OPENAIMODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are assisting novice designers in generating fresh and unexpected ideas for illustrations by creatively expanding user-provided keywords, inspired by a design brief.\n\nYou will be provided with:\n\n1. Three vote-weighted keyword lists (each item = { term: integer }):\n   - **Subject matter**: Specific nouns or noun phrases, including compound objects and descriptive pairings..\n   - **Action & pose**: Clearly implied actions or poses. Use the base form or descriptive phrases. \n   - **Theme & mood**: Adjectives or abstract nouns capturing emotion, setting, or cultural context. \n\n2. **Design Brief (string)**: A free-form text description of the overall illustration intent, use-case, or style.\n\n# Steps\n\n1. **Review Input**: Analyze the design brief and keyword lists.\n2. **Keyword Expansion**:\n   - Prioritize high-vote-weight terms.\n   - Creatively expand keywords by combining elements.\n   - Ensure new results are creative and different from originals.\n   - Include at least one Subject matter in each combination.\n   - Avoid simple rewordings or near-synonyms.\n   - Exclude variations like plurals and style descriptors (e.g., cartoon, illustration). \n   - Use root forms of words only.\n3. **Organize by Category**: Classify expanded keywords under \"Subject matter,\" \"Action & pose,\" and \"Theme & mood.\"\n\n# Output Format\n\nThe output should be a structured JSON object with keys for each category: \"Subject matter,\" \"Action & pose,\" and \"Theme & mood.\"\n\n# Examples\n\n**User Input:**  \n```json\n{\n  \"Subject matter\": {\n    \"robot\": 5,\n    \"abandoned city\": 4,\n    \"overgrown ruins\": 3,\n    \"satellite\": 2\n  },\n  \"Action & pose\": {\n    \"scanning\": 4,\n    \"walking\": 3,\n    \"repairing\": 2\n  },\n  \"Theme & mood\": {\n    \"melancholic\": 4,\n    \"mysterious\": 3,\n    \"hopeful\": 2\n  },\n  \"Brief\": \"A post-apocalyptic AI character wandering a lost city searching for signs of life.\"\n}\n```\n\n**Assistant Output:**  \n```json\n{\n  \"Subject matter\": [\n    \"plaza\",\n    \"power hub\",\n    \"vine-wrapped android\",\n    \"obelisk\"\n  ],\n  \"Action & pose\": [\n    \"kneeling\",\n    \"gently uncovering rubble\",\n    \"raising an antenna\"\n  ],\n  \"Theme & mood\": [\n    \"reverent\",\n    \"aching solitude\",\n    \"flickers of wonder\",\n    \"timeless curiosity\"\n  ]\n}\n```\n\n**User Input:**  \n```json\n{\n  \"Subject matter\": {\n    \"witch\": 5,\n    \"library\": 4,\n    \"books\": 3,\n    \"candles\": 2\n  },\n  \"Action & pose\": {\n    \"reading\": 4,\n    \"floating\": 3,\n    \"casting a spell\": 2\n  },\n  \"Theme & mood\": {\n    \"mystical\": 5,\n    \"dark\": 3,\n    \"cozy\": 2\n  },\n  \"Brief\": \"A magical study where a young witch explores forbidden knowledge in a floating library of shadows.\"\n}\n```\n\n**Assistant Output:**  \n```json\n{\n  \"Subject matter\": [\n    \"grimoire\",\n    \"candelabra\",\n    \"ink-drenched shadows\",\n    \"spellroom\"\n  ],\n  \"Action & pose\": [\n    \"gazing\",\n    \"hovering\",\n    \"summoning memories\"\n  ],\n  \"Theme & mood\": [\n    \"dread\",\n    \"hidden warmth\",\n    \"arcane\",\n    \"eerie intimacy\"\n  ]\n}\n```\n\n**User Input:**  \n```json\n{\n  \"Subject matter\": {\n    \"pirate ship\": 5,\n    \"kraken\": 4,\n    \"treasure chest\": 3,\n    \"foggy ocean\": 2\n  },\n  \"Action & pose\": {\n    \"battling\": 5,\n    \"climbing\": 3,\n    \"escaping\": 2\n  },\n  \"Theme & mood\": {\n    \"epic\": 4,\n    \"tense\": 3,\n    \"swashbuckling\": 2\n  },\n  \"Brief\": \"A cinematic sea battle where a pirate crew defends its treasure from a mythic sea monster in heavy fog.\"\n}\n```\n\n**Assistant Output:**  \n```json\n{\n  \"Subject matter\": [\n    \"mast graveyard\",\n    \"crow’s nest\",\n    \"glimmering vault\",\n    \"ghost-lantern fleet\"\n  ],\n  \"Action & pose\": [\n    \"leaping between sails\",\n    \"swinging a flaming chain\",\n    \"ripping open\"\n  ],\n  \"Theme & mood\": [\n    \"valor\",\n    \"haunted glory\",\n    \"desperation\",\n    \"reckless defiance\"\n  ]\n}\n```\n\n# Notes\n\n- Combine or remix at least two original keywords for each new keyword.\n- Emphasize boldness and novelty over similarity.\n- Ensure keywords are derived from original input without external information.\n\n\n"
        }
          ]
        },
        {
          role: "user",
          content: data
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      },
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });

    return JSON.parse(response.output_text);;
}

export async function recommendBroadNarrowKeywords (data) {
     const openai = getOpenAIClient();
     const response = await openai.responses.create({
      model: OPENAIMODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "Generate creative expansions for illustration concepts based on given keywords and a design brief.\n\nYou will be provided with:\n1. Three vote-weighted keyword lists (each item = { term: integer }):\n   - **Subject matter**: Specific nouns or noun phrases, including compound objects and descriptive pairings.\n   - **Action & pose**: Clearly implied actions or poses. Use the base form or descriptive phrases.\n   - **Theme & mood**: Adjectives or abstract nouns capturing emotion, setting, or cultural context.\n2. **Design Brief (string)**: A free-form text description of the overall illustration intent, use-case, or style.\n\n# Steps\n\n## Understand the Input\n- Thoroughly analyze the design brief and keyword lists to grasp the creative direction and intent.\n\n## Expand the Keywords Creatively\n- **Prioritize**: Emphasize high-vote-weight terms for expansion.\n- **Broader Expansions**: Generate terms that are more general, conceptual, or open-ended to inspire wide exploration.\n- **More Specific Expansions**: Create rich, vivid, or unexpected ideas that refine and sharpen the visual concept.\n- **Avoid**: Steer clear of simple rewordings, synonyms, plurals, or style descriptors like \"cartoon\" or \"vector\".\n- Ensure that each expansion is imaginative, meaningfully distinct, concise, and grounded in or inspired by at least one **Subject matter** keyword (whenever applicable). \n- For each top-level category — Broader and More Specific — generate a total of at most 10 expanded keywords combined across all three subcategories (Subject matter, Action & pose, Theme & mood).\n- Distribute these items in any way across the three subcategories, based on what is most natural and creative for the input. For example, you might do 4 Subject matter, 3 Action & pose, 3 Theme & mood for Broader, and 2, 5, 3 for More Specific.\n- Avoid rigidly forcing equal counts per subcategory; instead, focus on quality and creativity while keeping the total per top-level category at most 10.\n\n# Output Format\n\nOrganize your output into a structured JSON object with two top-level keys: \"Broader\" and \"More Specific\". Each should contain three subcategories: \"Subject matter\", \"Action & pose\", and \"Theme & mood\".\n\n# Examples\n\n**User Input:**  \n```json\n{\n  \"Subject matter\": {\n    \"oak tree\": 4,\n    \"fox\": 3,\n    \"mushroom\": 2\n  },\n  \"Theme & mood\": {\n    \"whimsical\": 5,\n    \"quiet\": 3,\n    \"eerie\": 1\n  },\n  \"Action & pose\": {\n    \"peering\": 4,\n    \"growing\": 3,\n    \"lurking\": 1\n  },\n  \"Brief\": \"Illustration for a fairy-tale children's book page set in an enchanted forest.\"\n}\n```\n\n**Assistant Output:**  \n```json\n{\n  \"Broader\": {\n    \"Subject matter\": [\n      \"enchanted woodland\",\n      \"woodland creatures\"\n    ],\n    \"Action & pose\": [\n      \"exploring hidden realms\",\n      \"awaiting discovery\"\n    ],\n    \"Theme & mood\": [\n      \"magical stillness\",\n      \"mysterious tranquility\"\n    ]\n  },\n  \"More Specific\": {\n    \"Subject matter\": [\n      \"fox curled atop ancient oak roots\",\n      \"mushrooms forming a glowing fairy ring\"\n    ],\n    \"Action & pose\": [\n      \"fox peering through tangled undergrowth\",\n      \"oak tree gently cradling tiny woodland animals\"\n    ],\n    \"Theme & mood\": [\n      \"playfully secretive atmosphere\",\n      \"subtle sense of wonder\"\n    ]\n  }\n}\n```\n\n**User Input:**\n```json\n{\n  \"Subject matter\": {\n    \"lantern\": 3,\n    \"owl\": 0\n  },\n  \"Theme & mood\": {\n    \"calm\": 2,\n    \"tense\": 1\n  },\n  \"Action & pose\": {},\n  \"Brief\": \"A night-time forest scene for a meditation app splash screen.\"\n}\n```\n\n**Assistant Output:**\n```json\n{\n  \"Broader\": {\n    \"Subject matter\": [\n      \"illuminated object\",\n      \"nocturnal forest life\",\n      \"source of gentle light\"\n    ],\n    \"Action & pose\": [\n      \"casting soft glow\",\n      \"enhancing stillness\"\n    ],\n    \"Theme & mood\": [\n      \"soothing atmosphere\",\n      \"tranquil energies\",\n      \"ethereal calm\"\n    ]\n  },\n  \"More Specific\": {\n    \"Subject matter\": [\n      \"lantern nestled in fern fronds\",\n      \"forest animals gazing at the light\"\n    ],\n    \"Action & pose\": [\n      \"radiating rippling halos\",\n      \"silent owl perche\",\n      \"weaving through mist\"\n    ],\n    \"Theme & mood\": [\n      \"hushed midnight calm\",\n      \"anticipation\",\n      \"misty veil of peace\"\n    ]\n  }\n}\n```\n\n**User Input:**\n```json\n{\n  \"Subject matter\": {\n    \"star\": 0,\n    \"moon\": 0,\n    \"planet\": 0\n  },\n  \"Theme & mood\": {\n    \"serene\": 0\n  },\n  \"Action & pose\": {\n    \"glowing\": 0,\n    \"orbiting\": 0,\n    \"drifting\": 0\n  },\n  \"Brief\": \"Scene illustrating a quiet night sky composition.\"\n}\n```\n\n**Assistant Output:**\n```json\n{\n  \"Broader\": {\n    \"Subject matter\": [\n      \"celestial bodies\",\n      \"cosmic landscape\",\n      \"nighttime expanse\"\n    ],\n    \"Action & pose\": [\n      \"gentle movement\",\n      \"celestial harmony\"\n    ],\n    \"Theme & mood\": [\n      \"tranquility\",\n      \"dreamlike stillness\",\n      \"universal calm\"\n    ]\n  },\n  \"More Specific\": {\n    \"Subject matter\": [\n      \"silver crescent moon\",\n      \"distant glowing planet\"\n    ],\n    \"Action & pose\": [\n      \"stars softly pulsing\",\n      \"planet slowly turning\",\n      \"moonlight subtly diffusing\"\n    ],\n    \"Theme & mood\": [\n      \"whispering silence\",\n      \"quiet cosmic serenity\"\n    ]\n  }\n}\n```\n\n# Notes\n\n- The keyword expansions should be highly creative, distinct, and concise to fuel unique illustration concepts.\n- Emphasize boldness and novelty over similarity.\n- Ensure all keywords are derived from the original input without external information."
        }
          ]
        },
        {
          role: "user",
          content: data
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      },
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });

    return JSON.parse(response.output_text);;
}

export async function generateTextualDescriptions (data) {
     const openai = getOpenAIClient();
     const response = await openai.responses.create({
      model: OPENAIMODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "Generate imaginative illustration concepts as a Creative Director & Collaborative-Ideation Assistant based on the provided inputs.\n\nYou will be provided with:\n\n1. Three vote-weighted keyword lists (each item = { term: integer }):\n   - **Subject matter**: Specific nouns or noun phrases, including compound objects and descriptive pairings. \n   - **Action & pose**: Clearly implied actions or poses. Use the base form or descriptive phrases. \n   - **Theme & mood**: Adjectives or abstract nouns capturing emotion, setting, or cultural context.\n\n2. **Design Brief (string)**: a free-form text description of the overall illustration intent, use-case, or style.\n\n# Task\n\nGenerate exactly three distinct illustration ideas that:\n- Prioritize higher-vote terms for visual and thematic prominence.\n- Reuse higher-vote terms as needed; omit or de-emphasize lower-vote terms if they conflict.\n- Ensure diversity across at least two of the three input categories.\n- Explore visual or narrative contrast where possible.\n- Clearly reflect the Design Brief in tone, function, and visual styling.\n\n# Output Format\n\nReturn a JSON object with an `\"output\"` key, where its value is an array of three entries. Each entry must include:\n- `\"Caption\"`: A vivid, concise scene title or description, focused on essential elements and cinematic framing. Avoid excessive adjectives.\n- `\"Objects\"`: An array of { object_name: description }, where each description includes key elements of the subject along with a brief description of its state, action, or theme.\n\n# Steps\n\n1. Analyze vote weights to identify high-priority terms.\n2. Develop three diverse illustration ideas ensuring thematic and visual coherence.\n3. Validate each concept against the Design Brief: the scene should reflect the intended function, audience, and visual tone.\n4. Construct cinematic Captions and concise Object descriptions that capture narrative clarity and visual intent.\n\n# Examples\n\n## Example 1\n\nUser Input:\n```json\n{\n  \"Subject matter\": {\n    \"oak tree\": 4,\n    \"fox\": 3,\n    \"mushroom\": 2\n  },\n  \"Theme & mood\": {\n    \"whimsical\": 5,\n    \"quiet\": 3,\n    \"eerie\": 1\n  },\n  \"Action & pose\": {\n    \"peering\": 4,\n    \"growing\": 3,\n    \"lurking\": 1\n  },\n  \"Brief\": \"Illustration for a fairy-tale children's book page set in an enchanted forest.\"\n}\n```\nAssistant Output:\n```json\n{\n  \"output\": [\n    {\n      \"Caption\": \"A fox peering from behind a whimsical oak tree with mushrooms at its roots\",\n      \"Objects\": [\n        { \"fox\": \"a bright-eyed fox cautiously peering from behind the oak, its body partly hidden\" },\n        { \"oak tree\": \"a dominant, twisting oak tree with moss-covered bark and wide, whimsical branches\" },\n        { \"mushroom\": \"a patch of mushrooms growing at the tree’s base, varied in color and size\" }\n      ]\n    },\n    {\n      \"Caption\": \"Mushrooms growing quietly beneath a vast oak tree in an enchanted forest clearing\",\n      \"Objects\": [\n        { \"oak tree\": \"a towering oak tree with curling limbs, casting soft shade over the clearing\" },\n        { \"mushroom\": \"clusters of bioluminescent mushrooms growing in a gentle spiral near its roots\" }\n      ]\n    },\n    {\n      \"Caption\": \"A fox sitting quietly beneath a bent oak tree in a whimsical woodland setting\",\n      \"Objects\": [\n        { \"fox\": \"a calm fox sitting with its tail wrapped around its feet, gazing into the distance\" },\n        { \"oak tree\": \"an oak tree arching over like a natural canopy, branches shaped like reaching fingers\" }\n      ]\n    }\n  ]\n}\n```\n\n## Example 2\n\nUser Input:\n```json\n{\n  \"Subject matter\": {\n    \"lantern\": 3,\n    \"owl\": 0\n  },\n  \"Theme & mood\": {\n    \"calm\": 2,\n    \"tense\": 1\n  },\n  \"Action & pose\": {},\n  \"Brief\": \"A night-time forest scene for a meditation app splash screen.\"\n}\n```\nAssistant Output:\n```json\n{\n  \"output\": [\n    {\n      \"Caption\": \"A lantern glowing softly on a quiet forest path at night\",\n      \"Objects\": [\n        { \"lantern\": \"a softly glowing lantern placed on the path, casting warm light over mossy ground\" }\n      ]\n    },\n    {\n      \"Caption\": \"A calm lantern hanging from a branch, lighting still forest air\",\n      \"Objects\": [\n        { \"lantern\": \"an old iron lantern hanging motionless from a branch, its flame slow and steady\" }\n      ]\n    },\n    {\n      \"Caption\": \"A lantern resting among tree roots under a calm night sky\",\n      \"Objects\": [\n        { \"lantern\": \"a calm lantern nestled into thick roots, surrounded by stones and leaf litter, glowing faintly\" }\n      ]\n    }\n  ]\n}\n```\n\n## Example 3\n\nUser Input:\n```json\n{\n  \"Subject matter\": {\n    \"star\": 0,\n    \"moon\": 0,\n    \"planet\": 0\n  },\n  \"Theme & mood\": {\n    \"serene\": 0\n  },\n  \"Action & pose\": {\n    \"glowing\": 0,\n    \"orbiting\": 0,\n    \"drifting\": 0\n  },\n  \"Brief\": \"Scene illustrating a quiet night sky composition.\"\n}\n```\nAssistant Output:\n```json\n{\n  \"output\": [\n    {\n      \"Caption\": \"A moon and planet drifting quietly across a star-dotted night sky\",\n      \"Objects\": [\n        { \"moon\": \"a faintly glowing moon, its surface softly textured and serene\" },\n        { \"planet\": \"a small planet drifting along a slow arc, barely illuminated\" },\n        { \"star\": \"tiny scattered stars twinkling in clusters across the sky\" }\n      ]\n    },\n    {\n      \"Caption\": \"A serene composition of orbiting celestial bodies beneath a moonlit sky\",\n      \"Objects\": [\n        { \"planet\": \"a pair of planets orbiting gently in the distance, trailing dim light\" },\n        { \"moon\": \"a silver moon centered in the sky, luminous and undisturbed\" },\n        { \"star\": \"a sparse field of stars forming a soft backdrop\" }\n      ]\n    },\n    {\n      \"Caption\": \"A glowing moon above drifting stars and a distant planet\",\n      \"Objects\": [\n        { \"moon\": \"a glowing moon hanging high, casting soft illumination downward\" },\n        { \"star\": \"a soft stream of stars drifting slowly like mist\" },\n        { \"planet\": \"a planet hovering low on the horizon, barely outlined\" }\n      ]\n    }\n  ]\n}\n```\n\n# Notes\n\n- Each concept should demonstrate a clear interpretative link to the Design Brief, which can subtly influence object choices and scene framing.\n- Optimize descriptions for thematic clarity and resonance, ensuring diversity across idea categories.\n"
            }
          ]
        },
        {
          role: "user",
          content: data
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      },
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });

    return JSON.parse(response.output_text);;
}

export async function generateLayout (data) {
     const openai = getOpenAIClient();
     const response = await openai.responses.create({
      model: OPENAIMODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a high-precision object localizer tasked with extracting normalized bounding boxes for each distinct object instance explicitly mentioned in a scene description.\n\n**Image Specifications:**\n\n- Size: 512 x 512 pixels.\n- Coordinate origin: top-left is (0, 0), bottom-right is (512, 512).\n\n# Input\n\n- **Caption**: Natural language description of the scene.\n- **Objects**: List of object names.\n\n# Output Format\n\nProvide a JSON object with a key \"output\" and a value as a list of tuples for each object:\n\n- Format: `(\"object_label\", [x_min, y_min, width, height])`\n- Normalize all bounding boxes to the [0, 1] range:\n  - x_min = left_pixel / 512\n  - y_min = top_pixel / 512\n  - width = box_width_pixels / 512\n  - height = box_height_pixels / 512\n- Ensure:\n  - x_min + width ≤ 1\n  - y_min + height ≤ 1\n- Each occurrence of an object must have a separate entry.\n\n# Examples\n\n**User input:**\n\n```json\n{\n  \"Caption\": \"A bustling city street at night with a yellow taxi beside a red sports car and a pedestrian crossing the road.\",\n  \"objects\": [\"taxi\", \"sports car\", \"pedestrian\"]\n}\n```\n\n**Assistant output:**\n\n```json\n{\n  \"output\": [\n    [\"taxi\", [0.210, 0.620, 0.250, 0.180]],\n    [\"sports car\", [0.480, 0.625, 0.270, 0.175]],\n    [\"pedestrian\", [0.395, 0.540, 0.080, 0.210]]\n  ]\n}\n```\n\n**User input:**\n\n```json\n{\n  \"Caption\": \"Top-down view of a breakfast table showing a plate with two sunny-side-up eggs, a slice of toast, and a cup of coffee.\",\n  \"objects\": [\"plate\", \"egg\", \"toast\", \"coffee\"]\n}\n```\n\n**Assistant output:**\n\n```json\n{\n  \"output\": [\n    [\"plate\", [0.130, 0.220, 0.740, 0.610]],\n    [\"egg\", [0.360, 0.350, 0.120, 0.100]],\n    [\"egg\", [0.500, 0.350, 0.120, 0.100]],\n    [\"toast\", [0.300, 0.550, 0.180, 0.130]],\n    [\"coffee\", [0.700, 0.240, 0.160, 0.200]]\n  ]\n}\n```\n\n**User input:**\n\n```json\n{\n  \"Caption\": \"A playful tabby cat is chasing a blue yarn ball across a wooden floor.\",\n  \"objects\": [\"cat\", \"yarn ball\"]\n}\n```\n\n**Assistant output:**\n\n```json\n{\n  \"output\": [\n    [\"cat\", [0.420, 0.400, 0.350, 0.300]],\n    [\"yarn ball\", [0.220, 0.520, 0.120, 0.120]]\n  ]\n}\n```\n\n**User input:**\n\n```json\n{\n  \"Caption\": \"A group of three hikers stands on a rocky cliff overlooking a sunset.\",\n  \"objects\": [\"hiker\", \"cliff\"]\n}\n```\n\n**Assistant output:**\n\n```json\n{\n  \"output\": [\n    [\"hiker\", [0.150, 0.480, 0.130, 0.220]],\n    [\"hiker\", [0.310, 0.460, 0.140, 0.240]],\n    [\"hiker\", [0.480, 0.470, 0.125, 0.230]],\n    [\"cliff\", [0.000, 0.600, 1.000, 0.400]]\n  ]\n}\n```\n\n# Notes\n\n- Utilize best judgment to localize objects based on the scene description.\n- Provide accurate bounding boxes for each object instance present in the caption.\n"
            }
          ]
        },
        {
          role: "user",
          content: data
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      },
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });

    return JSON.parse(response.output_text);;
}

export async function matchLayout (data) {
     const openai = getOpenAIClient();
     const response = await openai.responses.create({
      model: OPENAIMODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a spatial reasoning expert responsible for aligning objects with bounding boxes based on scene descriptions in a natural and balanced way.\n\n# Input\n\n- **Caption**: Natural language description of the scene.\n- **Objects**: List of object names (duplicates possible).\n- **Boxes**: List of bounding box coordinates, unordered.\n\nBounding box format: [x, y, w, h]\n- x, y: Top-left corner coordinates (0 to 1 range).\n- w, h: Width and height (0 to 1 range).\n\nImage frame spans from [0,0] (top-left) to [1,1] (bottom-right).\n\n# Task\n\nYour task is to assign each object a unique bounding box:\n- Ensure the spatial relationships in the caption are respected (e.g., \"on the left\", \"above\").\n- Each bounding box must only be used once.\n- Avoid unnatural object clustering; maintain visual plausibility.\n- Consider implied object sizes and relationships (e.g., \"small mouse under large table\").\n- Ensure all bounding boxes remain within the [0,1] frame.\n\n# Output Format\n\nOutput a JSON object with a key \"output\", where its value is a list of tuples with `N` elements: `[(\"object_name\", [x, y, w, h]), ...]`.\n\n# Examples\n\n**Example 1:**\n\nUser input: \n```json\n{ \"Caption\": \"A tabby cat stretches on the right edge of a sunlit sofa, while a small gray mouse peeks from a hole at the bottom left.\",\n  \"Objects\": [\"cat\", \"mouse\", \"sofa\"],  \n  \"Boxes\": [ [0.750, 0.200, 0.230, 0.400], [0.050, 0.700, 0.120, 0.180], [0.100, 0.100, 0.800, 0.700] ]\n}\n```\nAssistant Output: \n```json\n{ \"output\": [(\"sofa\", [0.100, 0.100, 0.800, 0.700]), (\"cat\", [0.750, 0.200, 0.230, 0.400]), (\"mouse\", [0.050, 0.700, 0.120, 0.180])] }\n```\n\n**Example 2:**\n\nUser input: \n```json\n{\n  \"Caption\": \"A bustling city street scene with a yellow taxi in the foreground, a red sports car behind it slightly to the left, and a pedestrian crossing in front.\",\n  \"Objects\": [\"taxi\", \"sports car\", \"pedestrian\"],\n  \"Boxes\": [[0.100, 0.600, 0.500, 0.350], [0.050, 0.700, 0.200, 0.200], [0.650, 0.550, 0.150, 0.300]]\n}\n```\n\nAssistant output: \n```json\n{\n  \"output\": [[\"taxi\", [0.050, 0.700, 0.200, 0.200]], [\"sports car\", [0.100, 0.600, 0.500, 0.350]], [\"pedestrian\", [0.650, 0.550, 0.150, 0.300]]]\n}\n```\n\n**Example 3:**\n\nUser input: \n```json\n{\n  \"Caption\": \"A painting of a hot-air balloon drifting above rolling hills with a lone oak tree on the left hill.\",\n  \"Objects\": [\"balloon\", \"hills\", \"tree\"],\n  \"Boxes\": [[0.350, 0.100, 0.300, 0.300], [0.000, 0.400, 1.000, 0.600], [0.100, 0.450, 0.150, 0.300]]\n}\n```\n\nAssistant output:\n```json\n{\n  \"output\": [[\"hills\", [0.000, 0.400, 1.000, 0.600]], [\"tree\", [0.100, 0.450, 0.150, 0.300]], [\"balloon\", [0.350, 0.100, 0.300, 0.300]]]\n}\n```\n\n**Example 4:**\n\nUser input:\n```json\n{\n  \"Caption\": \"An aerial view of a boat sailing south of a group of five kayakers on a calm lake.\",\n  \"Objects\": [\"boat\", \"kayaker\", \"kayaker\", \"kayaker\", \"kayaker\", \"kayaker\"],\n  \"Boxes\": [[0.450, 0.200, 0.100, 0.100], [0.200, 0.400, 0.080, 0.080], [0.300, 0.420, 0.080, 0.080], [0.400, 0.440, 0.080, 0.080], [0.500, 0.460, 0.080, 0.080], [0.600, 0.480, 0.080, 0.080]]\n}\n```\nAssistant output: \n```json\n{\n  \"output\": [\n    [\"kayaker\", [0.200, 0.400, 0.080, 0.080]],\n    [\"kayaker\", [0.300, 0.420, 0.080, 0.080]],\n    [\"kayaker\", [0.400, 0.440, 0.080, 0.080]],\n    [\"kayaker\", [0.500, 0.460, 0.080, 0.080]],\n    [\"kayaker\", [0.600, 0.480, 0.080, 0.080]],\n    [\"boat\", [0.450, 0.200, 0.100, 0.100]]\n  ]\n}\n```\n\n# Notes\n\n- Approach the task as solving a visual layout puzzle, ensuring semantic and spatial coherence.\n- Adapt to various caption styles for effective scene interpretation.\n"
            }
          ]
        },
        {
          role: "user",
          content: data
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      },
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });
    
    return JSON.parse(response.output_text);;
}
