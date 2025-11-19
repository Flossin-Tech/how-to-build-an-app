#!/bin/bash

# Fix topic references in all learning paths
# Replaces unit-testing and integration-testing with unit-integration-testing

echo "Fixing topic references in learning paths..."

# Fix unit-testing references (but not unit-integration-testing)
find learning-paths -name "*.json" -type f -exec sed -i '' 's/"topic": "unit-testing"/"topic": "unit-integration-testing"/g' {} +

# Fix integration-testing references (but not unit-integration-testing)
find learning-paths -name "*.json" -type f -exec sed -i '' 's/"topic": "integration-testing"/"topic": "unit-integration-testing"/g' {} +

echo "✓ Fixed unit-testing → unit-integration-testing"
echo "✓ Fixed integration-testing → unit-integration-testing"

# Mark frontend-architecture as optional (non-required) where it appears
echo ""
echo "Marking frontend-architecture steps as optional..."

# This is more complex, so we'll list files that need manual review
echo "Files containing frontend-architecture references:"
grep -l '"frontend-architecture"' learning-paths/**/*.json

echo ""
echo "Marking microfrontend case study as optional..."
echo "Files containing microfrontend-vs-monolith-case-study references:"
grep -l '"microfrontend-vs-monolith-case-study"' learning-paths/**/*.json

echo ""
echo "✓ Topic reference fixes complete!"
echo ""
echo "Note: frontend-architecture and case study references should be marked as optional manually"
echo "      or content should be created for them."
