const text = async () => {
    try {
        const response = await fetch(
            'https://supportdesk.fskindia.com/support/initiate-support-request',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'H1XFN5orWT6AH7Zggn70JsnVsUfAgo_I'
                },
                body: JSON.stringify({
                    "name": "Sundeep Singh",
                    "email": "sundeepsingh.ca@gmail.com",
                    "mobile": "1234567890",
                    "department_id": 5,
                    "issue_description": "Testing WebSocket connection",
                    "priority": "MEDIUM",
                    "site_id": 5
                })
            }
        );
        // const data = await response.json();

        // console.log(data);
        // return data;
    } catch (error) {
        console.error(error);
    }
};

text();