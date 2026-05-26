#!/bin/bash
# Test runner script for the Admin-Records Backend

echo "🧪 Running Admin-Records Backend Tests..."
echo "=========================================="

# Run all tests with coverage
npm run test:coverage -- --forceExit

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "Test output artifacts:"
    echo "- Coverage report: coverage/ directory"
    echo "- LCOV report: coverage/lcov-report/index.html"
else
    echo ""
    echo "❌ Some tests failed with exit code: $EXIT_CODE"
    echo ""
    echo "To run tests individually:"
    echo "  npm test -- errors.test.ts"
    echo "  npm test -- config.test.ts"
    echo "  npm test -- jwt.test.ts"
    echo "  npm test -- integration.test.ts"
    echo "  npm test -- errorHandler.test.ts"
fi

exit $EXIT_CODE
