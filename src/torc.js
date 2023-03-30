//const TOKEN = process.env.TORC_TOKEN;
const TOKEN =
    'eyJraWQiOiJZXC8zcVd2NjI4XC9pcXNWdGo1N29KOE5lZUhoa3ZtRFNHajc5YjFoT05jVXM9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI1YTg0MDVlOC04Zjk4LTQ4M2YtODg5MS00MjFiYzQ4ZjdhNjQiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xX2Q2NGE2NDVjLTAxZGMtNDNhMi04NDA4LWVjM2YwZjg2ZDNkZCIsImNvZ25pdG86Z3JvdXBzIjpbIkFkbWluIiwiVXNlck1hbmFnZXJzIiwiY3VzdG9tZXJzIiwiSm9iRW5hYmxlZCJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV83U1ZkNTJSNDkiLCJjbGllbnRfaWQiOiI3aWFhOWtvZjJnazkxdjg4dmo1bjMwZ3Y0ZSIsIm9yaWdpbl9qdGkiOiJjMTRmYTZhMC0yODk0LTQwMGYtODYwMi1iZDRlY2FlZTA2M2MiLCJldmVudF9pZCI6Ijk0OWU3MDZkLWQ4Y2UtNGVlNy1hY2EyLWIzODFhZmRlNjE5MSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE2ODAxODcyNDYsImV4cCI6MTY4MDE5NTUwMywiaWF0IjoxNjgwMTkxOTA1LCJqdGkiOiJhNjNlNjNkNy0wNDg3LTQ5ZDQtOTczMi01OTI5ZmIzMTY0NjAiLCJ1c2VybmFtZSI6ImRhdmVkZXY0MTgifQ.Ye041b8AIv6Dyi39L5U7qZq6AibegSbsLKuoRycTKs_on6BR4jO3gWN9elbujwGzTkLQ9D56hZJ4ZnpcRcoce_hbh_lAk3YCM-W5OsKQ6d-swRYAEkoFNpl2LaH7XGGO_BFPdomK9hcip4Qj7fSXvjg_omqehASuHxa0HgsnE6vhkwzXAKL0NlD0SO5ZMYKMOqxQBWs9UTxUOf8d8IZJrq2d7T2zTUfLp0qlfw_SxDTrI3X_j7UXgzLUAdxGS5dx5yh7nWc2FdQUwVDZqFVoBlwkbrms8mx9UOftxjKBqjuzHuJS5Pj34Bfb4CNqsSglC6K7QT_Hv9Y7QZtbuts6jQ';

async function getUserByUsername(username) {
    const customHeaders = {
        Accept: 'application/json',
        authorization: TOKEN
    };
    const url = 'https://ow5367tbxbardj4c7idinfi7my.appsync-api.us-east-1.amazonaws.com/graphql';
    const getUsername = `
    {
    "query": "query GetUserByUsername($username: String!) {  fields: getUserByUsername(username: $username) {    items {   id }}}",  
    "variables": {
         "username": "${username}"
    }
}

 `;

    console.log(getUsername);
    let result = await fetch(url, {
        method: 'POST',
        headers: customHeaders,
        body: getUsername
    })
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            return data;
        });
    console.log(result);
    return result.data.fields.items[0].id;
}
export default async function postJobs(jobsJSON, username) {
    const userId = await getUserByUsername(username);
    const careerString = formatCareersJSON(jobsJSON);
    console.log(careerString);
    const customHeaders = {
        Accept: 'application/json',
        authorization: TOKEN
    };
    const url = 'https://ow5367tbxbardj4c7idinfi7my.appsync-api.us-east-1.amazonaws.com/graphql';
    // console.log(`${userId} and ${badgeid}`);
    //console.log(customHeaders);
    const updateUserMutation = `

{
    "query": "mutation UpdateUser($input: UpdateUserInput!) {  updateUser(input: $input) {    id    agreedToMarketing    agreedToTerms    company    family_name    given_name    careers {      companyName      description      endDate      format      locationType      stack      startDate      title    }    projectsCaseStudies {      client      description      endDate      workType      link      stack      startDate      title      images    }    location {      cityName      countryCode      countryId      countryName      latitude      locationId      longitude      stateCode      stateId      stateName      wikiDataId    }    ratePerHour {      currency      value    }    referrerCode    username    userType  }}",
    "variables": {
        "input": {
            "id": "${userId}",
            "careers": [
                ${careerString}
            ]
        }
    }
}
 `;

    console.log(updateUserMutation);
    let result = await fetch(url, {
        method: 'POST',
        headers: customHeaders,
        body: updateUserMutation
    })
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            return data;
        });
    console.log(result);
    alert(result);
}

function formatCareersJSON(jobsJSON) {
    const jobs = JSON.parse(jobsJSON);
    const careers = jobs.work;
    let careerString = '';
    careers.forEach((job) => {
        console.log(job.name);

        let jobSummary,
            jobEndDate = '';
        if (job?.summary && job?.summary !== undefined) {
            jobSummary = job?.summary?.replace(/(?:\"|\’|)/g, '').replace(/(?:\r\n|\r|\n|,)/g, ' ');
        }
        if (job?.endDate) {
            jobEndDate = `"endDate": "${job?.endDate}T05:00:00.000Z",`;
        }
        careerString += `
        {
                    "title": "${job.position}",
                    "companyName": "${job.name}",
                    "startDate": "${job.startDate}T05:00:00.000Z",
                    ${jobEndDate}
                    "description": "${jobSummary}"
                },`;
    });

    console.log(careerString);
    if (careerString.length > 0) {
        careerString = careerString.slice(0, -1);
    }
    return careerString;
}
