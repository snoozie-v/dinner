// src/components/PrivacyPolicyModal.tsx

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal = ({ isOpen, onClose }: PrivacyPolicyModalProps) => {
  if (!isOpen) return null;

  const lastUpdated = 'January 21, 2026';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: {lastUpdated}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            {/* Introduction */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Introduction</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome to Meal Planner ("we," "our," or "us"). We are committed to protecting your privacy.
                This Privacy Policy explains how we handle information when you use our meal planning application
                (the "App").
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Information We Collect</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                <strong className="text-gray-800 dark:text-gray-200">We do not collect any personal information.</strong> The App operates entirely on your device and does not transmit any data to external servers.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                All data you create within the App, including:
              </p>
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>Meal plans and recipes</li>
                <li>Shopping lists</li>
                <li>Pantry staples</li>
                <li>Saved templates</li>
                <li>App preferences (theme, favorites)</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                is stored <strong className="text-gray-800 dark:text-gray-200">locally on your device</strong> using
                your browser's local storage. This data never leaves your device.
              </p>
            </section>

            {/* Data Storage */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Storage</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your data is stored using browser local storage technology. This means:
              </p>
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>Data remains on your device only</li>
                <li>Data persists between sessions until you clear it</li>
                <li>Clearing your browser data will delete your App data</li>
                <li>Data is not synced across devices</li>
                <li>We cannot access, view, or recover your data</li>
              </ul>
            </section>

            {/* Third-Party Services */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Third-Party Services</h3>
              <p className="text-gray-600 dark:text-gray-400">
                The App does not integrate with any third-party analytics, advertising, or tracking services.
                We do not share any information with third parties because we do not collect any information.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Cookies and Tracking</h3>
              <p className="text-gray-600 dark:text-gray-400">
                The App does not use cookies or any tracking technologies. We do not track your usage,
                behavior, or any other activities within the App.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Children's Privacy</h3>
              <p className="text-gray-600 dark:text-gray-400">
                The App does not collect personal information from anyone, including children under 13 years of age.
                Since all data is stored locally and we have no access to it, there are no special considerations
                needed for children's data.
              </p>
            </section>

            {/* Data Deletion */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Your Data Rights</h3>
              <p className="text-gray-600 dark:text-gray-400">
                You have complete control over your data:
              </p>
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li><strong className="text-gray-800 dark:text-gray-200">Access:</strong> All your data is visible within the App</li>
                <li><strong className="text-gray-800 dark:text-gray-200">Modification:</strong> You can edit any data at any time</li>
                <li><strong className="text-gray-800 dark:text-gray-200">Deletion:</strong> Use the "Clear All Data" button in the App to delete all stored data, or clear your browser's local storage</li>
                <li><strong className="text-gray-800 dark:text-gray-200">Portability:</strong> You can copy your shopping lists using the built-in copy feature</li>
              </ul>
            </section>

            {/* Security */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Security</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Since your data is stored only on your device and is never transmitted over the internet,
                it is protected by your device's security measures. We recommend:
              </p>
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>Keeping your device and browser updated</li>
                <li>Using device-level security (passcode, biometrics)</li>
                <li>Being cautious when using shared or public devices</li>
              </ul>
            </section>

            {/* Changes to Policy */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Changes to This Policy</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We may update this Privacy Policy from time to time. Any changes will be reflected in the
                "Last updated" date at the top of this policy. We encourage you to review this policy
                periodically.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Contact Us</h3>
              <p className="text-gray-600 dark:text-gray-400">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                <strong className="text-gray-800 dark:text-gray-200">Email:</strong> privacy@mealplanner.app
              </p>
            </section>

            {/* Summary Box */}
            <section className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Privacy Summary</h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>✓ No data collection</li>
                <li>✓ No tracking or analytics</li>
                <li>✓ No third-party sharing</li>
                <li>✓ All data stored locally on your device</li>
                <li>✓ You control your data completely</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium touch-manipulation min-h-[44px]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
