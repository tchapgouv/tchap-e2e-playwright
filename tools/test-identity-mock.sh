#!/bin/bash

# Test script for the Matrix Identity Server mock
# This script sends requests to the mock server with different email addresses
# and displays the responses

# Set the base URL for the mock server
MOCK_URL="http://localhost:8083"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make a request and display the result
test_email() {
    local email=$1
    local description=$2
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Email: $email"
    
    # Make the request
    response=$(curl -s "$MOCK_URL/_matrix/identity/api/v1/internal-info?medium=email&address=$email")
    
    # Display the response
    echo "Response:"
    echo -e "${GREEN}$response${NC}"
    echo "----------------------------------------"
}

# Check if the mock server is running
echo "Checking if the mock server is running..."
if ! curl -s "$MOCK_URL/__admin/mappings" > /dev/null; then
    echo "Error: Mock server is not running at $MOCK_URL"
    echo "Please start the mock server with: docker-compose up identity-mock"
    exit 1
fi

# Display the available mappings
echo "Available mappings:"
curl -s "$MOCK_URL/__admin/mappings" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "No named mappings found"

echo "Mock server is running at $MOCK_URL"
echo "----------------------------------------"

# Test different email addresses
test_email "user@tchapgouv.com" "Agent"
test_email "user@invited.externe.com" "Externe avec invit"
test_email "user@not.invited.externe.com" "Externe sans invit"
test_email "user@wrong.server.com" "User on wrong server"

# Test with a custom email to demonstrate the template functionality
echo -e "${YELLOW}Enter a custom email address to test (or press Enter to skip):${NC}"
read custom_email

if [ ! -z "$custom_email" ]; then
    test_email "$custom_email" "Custom email test"
fi

echo "All tests completed!"
