//const TOKEN = process.env.TORC_TOKEN;
const TOKEN = 'eyJraWQi';

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
