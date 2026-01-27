// src/components/HelpModal.tsx
import { useState, useEffect } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpSection = 'overview' | 'ingredients' | 'instructions' | 'importing' | 'tips';

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  const [activeSection, setActiveSection] = useState<HelpSection>('overview');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sections: { id: HelpSection; label: string; icon: JSX.Element }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'ingredients',
      label: 'Ingredients',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'instructions',
      label: 'Instructions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'importing',
      label: 'Importing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      id: 'tips',
      label: 'Tips',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 pt-12 sm:pt-4 overscroll-contain safe-area-top"
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-white">User Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <nav className="sm:w-48 bg-gray-50 dark:bg-gray-900 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible p-2 gap-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'ingredients' && <IngredientsSection />}
            {activeSection === 'instructions' && <InstructionsSection />}
            {activeSection === 'importing' && <ImportingSection />}
            {activeSection === 'tips' && <TipsSection />}
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewSection = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Welcome to Meal Planner</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
        Meal Planner helps you organize your weekly meals, automatically generate shopping lists, and discover new recipes.
        Here's a quick overview of the main features:
      </p>
    </div>

    <div className="grid gap-4">
      <FeatureCard
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        title="Plan Tab"
        description="Plan multiple meals per day (breakfast, lunch, dinner, and more). Set the number of days, randomize meals or pick specific recipes, adjust servings, and add prep notes."
      />
      <FeatureCard
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        title="Shop Tab"
        description="View your auto-generated shopping list organized by store section. Filter by day range to shop for just a portion of your plan, check off items as you shop, and mark pantry staples."
      />
      <FeatureCard
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        title="Recipes Tab"
        description="Browse the recipe library, create custom recipes, import from websites, mark favorites, and manage your collection."
      />
    </div>

    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
      <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Quick Start</h4>
      <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300 text-sm">
        <li>Set how many days you want to plan for</li>
        <li>Click "Randomize" or select recipes manually for each day</li>
        <li>Go to the Shop tab to see your shopping list</li>
        <li>On cooking day, tap "View" on your planned meal to see the full recipe</li>
      </ol>
    </div>
  </div>
);

const IngredientsSection = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Formatting Ingredients</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
        When adding recipes, you can paste multiple ingredients at once. The app will automatically parse quantities, units, and preparation notes.
      </p>
    </div>

    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Supported Formats</h4>
      <div className="space-y-4 text-sm">
        <FormatExample
          title="Basic format"
          examples={[
            '2 cups flour',
            '1 lb ground beef',
            '3 cloves garlic',
          ]}
        />
        <FormatExample
          title="With fractions"
          examples={[
            '1/2 cup sugar',
            '1 1/2 tsp vanilla extract',
            '3/4 lb chicken breast',
          ]}
        />
        <FormatExample
          title="With preparation notes (comma or parentheses)"
          examples={[
            '1 onion, diced',
            '2 cups cabbage (shredded)',
            '3 carrots, peeled and sliced',
          ]}
        />
        <FormatExample
          title="Ranges (will average)"
          examples={[
            '2-3 tablespoons olive oil',
            '1-2 cups water',
          ]}
        />
        <FormatExample
          title="No quantity"
          examples={[
            'Salt to taste',
            'Fresh parsley for garnish',
          ]}
        />
      </div>
    </div>

    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
      <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Recognized Units</h4>
      <p className="text-amber-800 dark:text-amber-300 text-sm mb-2">
        The parser recognizes these common units (singular and plural):
      </p>
      <div className="flex flex-wrap gap-2">
        {['cup', 'tablespoon/tbsp', 'teaspoon/tsp', 'pound/lb', 'ounce/oz', 'gram/g', 'kilogram/kg', 'milliliter/ml', 'liter/L', 'quart', 'pint', 'gallon', 'clove', 'bunch', 'head', 'piece', 'slice', 'can', 'jar', 'package/pkg'].map((unit) => (
          <span key={unit} className="px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded text-xs font-mono">
            {unit}
          </span>
        ))}
      </div>
    </div>

    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
      <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Bulk Paste Tips</h4>
      <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-300 text-sm">
        <li>Click "Paste Multiple Ingredients" to open the bulk entry area</li>
        <li>Paste your ingredient list with one ingredient per line</li>
        <li>The parser will automatically detect quantities, units, and prep notes</li>
        <li>Review the parsed results and adjust if needed</li>
      </ul>
    </div>
  </div>
);

const InstructionsSection = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Formatting Instructions</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
        Instructions can be organized into sections (like "For the Sauce" or "Assembly"). Use the bulk paste feature to quickly add steps.
      </p>
    </div>

    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Supported Formats</h4>
      <div className="space-y-4 text-sm">
        <FormatExample
          title="Numbered steps"
          examples={[
            '1. Preheat oven to 350°F.',
            '2. Mix dry ingredients in a bowl.',
            '3. Add wet ingredients and stir.',
          ]}
        />
        <FormatExample
          title="Plain paragraphs (one step per line)"
          examples={[
            'Preheat oven to 350°F.',
            'Mix dry ingredients in a bowl.',
            'Add wet ingredients and stir until combined.',
          ]}
        />
        <FormatExample
          title="Bulleted lists"
          examples={[
            '- Season the chicken with salt and pepper.',
            '- Heat oil in a large skillet.',
            '- Cook until golden brown on each side.',
          ]}
        />
      </div>
    </div>

    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
      <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">Using Sections</h4>
      <p className="text-purple-800 dark:text-purple-300 text-sm mb-3">
        Organize complex recipes into logical sections:
      </p>
      <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-xs space-y-3">
        <div>
          <p className="text-purple-600 dark:text-purple-400 font-semibold">Section: For the Marinade</p>
          <p className="text-gray-600 dark:text-gray-400">1. Combine soy sauce, garlic, and ginger.</p>
          <p className="text-gray-600 dark:text-gray-400">2. Add chicken and refrigerate for 2 hours.</p>
        </div>
        <div>
          <p className="text-purple-600 dark:text-purple-400 font-semibold">Section: For the Stir Fry</p>
          <p className="text-gray-600 dark:text-gray-400">1. Heat wok over high heat.</p>
          <p className="text-gray-600 dark:text-gray-400">2. Add marinated chicken and cook until done.</p>
        </div>
      </div>
    </div>

    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
      <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Bulk Paste Tips</h4>
      <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-300 text-sm">
        <li>Click "Paste Instructions" to open the bulk entry area</li>
        <li>Enter a section name (optional) like "Main Steps" or "For the Sauce"</li>
        <li>Paste your instructions - numbered, bulleted, or plain text</li>
        <li>Each line becomes a separate step</li>
        <li>Add multiple sections for complex recipes</li>
      </ul>
    </div>
  </div>
);

const ImportingSection = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Importing Recipes</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
        Save time by importing recipes directly from your favorite cooking websites. The app extracts recipe details automatically.
      </p>
    </div>

    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Supported Websites</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        {[
          'AllRecipes', 'Food Network', 'Serious Eats', 'Budget Bytes',
          'Simply Recipes', 'Bon Appetit', 'Epicurious', 'Delish',
          'Cookie and Kate', 'Minimalist Baker', 'Pinch of Yum', 'Love and Lemons',
          'Recipe Tin Eats', 'The Kitchn', 'Food52', 'King Arthur Baking',
          'Tasty', 'Smitten Kitchen', 'Sally\'s Baking', 'HelloFresh'
        ].map((site) => (
          <span key={site} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
            {site}
          </span>
        ))}
      </div>
    </div>

    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
      <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">How to Import</h4>
      <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-300 text-sm">
        <li>Go to the <strong>Recipes</strong> tab</li>
        <li>Click <strong>Import from URL</strong></li>
        <li>Paste the recipe URL from a supported website</li>
        <li>Click <strong>Import Recipe</strong></li>
        <li>Review the imported details and make any adjustments</li>
        <li>Click <strong>Save Recipe</strong></li>
      </ol>
    </div>

    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
      <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Import Tips</h4>
      <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300 text-sm">
        <li>Make sure to use the full recipe URL (not a search results page)</li>
        <li>Some websites work better than others - if import fails, try manual entry</li>
        <li>Always review imported recipes for accuracy</li>
        <li>You can edit any imported recipe after saving</li>
      </ul>
    </div>
  </div>
);

const TipsSection = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Tips & Tricks</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
        Get the most out of Meal Planner with these helpful tips.
      </p>
    </div>

    <div className="space-y-4">
      <TipCard
        title="Adjust Servings Per Meal"
        description="Use the multiplier buttons (0.5x, 1x, 1.5x, 2x) on each planned meal to scale the recipe. This automatically adjusts ingredient quantities in your shopping list."
      />
      <TipCard
        title="Add Prep Notes"
        description="Click 'Add prep notes' on any planned meal to remind yourself of prep work (like 'Marinate chicken the night before')."
      />
      <TipCard
        title="Use Pantry Staples"
        description="Mark items you always have (salt, oil, basic spices) as pantry staples. They'll automatically be checked off in your shopping list."
      />
      <TipCard
        title="Save Templates"
        description="Created a perfect week of meals? Save it as a template to quickly load again later. Great for recurring meal rotations."
      />
      <TipCard
        title="Star Your Favorites"
        description="Click the star icon on recipes you love. Filter by 'Favorites' in the recipe browser for quick access."
      />
      <TipCard
        title="View Recipe While Cooking"
        description="On the Plan tab, click 'View' on any meal to open the full recipe in a modal - perfect for following along while cooking."
      />
      <TipCard
        title="Drag to Reorder Days"
        description="Use the drag handle on the left side of each day card to reorder your days. All meals for that day move together."
      />
      <TipCard
        title="Customize Meal Types"
        description="Click 'Meal Settings' in the Plan tab to choose which meals to plan each day. Enable dessert or snack slots, or disable breakfast if you only want to plan dinner."
      />
      <TipCard
        title="Smart Recipe Suggestions"
        description="When picking a recipe for a meal slot, recipes tagged for that meal type appear first. For example, lunch recipes show first when filling a lunch slot."
      />
      <TipCard
        title="Undo Mistakes"
        description="Accidentally deleted something? Look for the undo toast notification that appears for 5 seconds after any deletion."
      />
      <TipCard
        title="Filter by Tags"
        description="Use tags like 'quick', 'vegetarian', or 'beef-dish' to filter recipes. Add custom tags when creating recipes."
      />
      <TipCard
        title="Shop for Specific Days"
        description="Planning for a month but only shopping for a week? Use the day range selector at the top of your shopping list to filter ingredients for just the days you need (e.g., days 1-7). Quick week buttons make it easy to switch between weeks."
      />
      <TipCard
        title="Share Your Shopping List"
        description="Use the Copy or Share button on the shopping list to send it to family members or another app on your phone."
      />
      <TipCard
        title="Dark Mode"
        description="Click the sun/moon icon in the top right to toggle between light and dark themes. Your preference is saved automatically."
      />
      <TipCard
        title="Bulk Paste Ingredients"
        description="When creating recipes, click 'Paste Multiple Ingredients' to add many ingredients at once. Supports fractions like 1/2 cup."
      />
      <TipCard
        title="Backup & Restore"
        description="Click 'Backup & Restore' in the footer to access Data Settings. Export your data as a backup file, and import it later to restore everything."
      />
    </div>
  </div>
);

// Helper Components
const FeatureCard = ({ icon, title, description }: { icon: JSX.Element; title: string; description: string }) => (
  <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
    </div>
  </div>
);

const FormatExample = ({ title, examples }: { title: string; examples: string[] }) => (
  <div>
    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{title}:</p>
    <div className="bg-white dark:bg-gray-800 rounded p-2 space-y-1">
      {examples.map((example, idx) => (
        <p key={idx} className="font-mono text-gray-600 dark:text-gray-400">{example}</p>
      ))}
    </div>
  </div>
);

const TipCard = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
    <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
  </div>
);

export default HelpModal;
