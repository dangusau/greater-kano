import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Terms & Conditions</h1>

      <p className="text-sm text-gray-600 mb-4">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p>
          Welcome to Greater Kano Business Community (GKBC). By creating an account
          or using our platform, you agree to these Terms and Conditions.
        </p>

        <h2 className="font-semibold">1. Eligibility</h2>
        <p>
          You must provide accurate information during registration. Accounts are
          subject to approval by GKBC administrators before full access is granted.
        </p>

        <h2 className="font-semibold">2. Account Approval</h2>
        <p>
          GKBC reserves the right to approve, suspend, or reject any account or
          business listing that violates community rules or local laws.
        </p>

        <h2 className="font-semibold">3. User Responsibilities</h2>
        <p>
          You are responsible for all activities conducted through your account.
          Fraud, impersonation, or misleading content is strictly prohibited.
        </p>

        <h2 className="font-semibold">4. Content & Listings</h2>
        <p>
          Businesses and listings must be accurate and lawful. GKBC may remove
          content without notice if it violates our policies.
        </p>

        <h2 className="font-semibold">5. Termination</h2>
        <p>
          GKBC may terminate or restrict access to any account at its discretion.
        </p>

        <h2 className="font-semibold">6. Changes</h2>
        <p>
          These terms may be updated at any time. Continued use of the platform
          implies acceptance of updated terms.
        </p>

        <p className="mt-6">
          If you have questions, contact us via the Help & Support section.
        </p>
      </div>
    </div>
  );
};

export default Terms;
