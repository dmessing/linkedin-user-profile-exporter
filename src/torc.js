//const TOKEN = process.env.TORC_TOKEN;
const TOKEN =
    'eyJraWQiOiJZXC8zcVd2NjI4XC9pcXNWdGo1N29KOE5lZUhoa3ZtRFNHajc5YjFoT05jVXM9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI1YTg0MDVlOC04Zjk4LTQ4M2YtODg5MS00MjFiYzQ4ZjdhNjQiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xX2Q2NGE2NDVjLTAxZGMtNDNhMi04NDA4LWVjM2YwZjg2ZDNkZCIsImNvZ25pdG86Z3JvdXBzIjpbIkFkbWluIiwiVXNlck1hbmFnZXJzIiwiY3VzdG9tZXJzIiwiSm9iRW5hYmxlZCJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV83U1ZkNTJSNDkiLCJjbGllbnRfaWQiOiI3aWFhOWtvZjJnazkxdjg4dmo1bjMwZ3Y0ZSIsIm9yaWdpbl9qdGkiOiJiMDFkMDJjZS00ZjFiLTQxYmYtOTA2YS1lNjVmNGY1MWJiOTciLCJldmVudF9pZCI6ImY1MDFhMTkwLWY2NmYtNGIxYy1iYjUyLWYxNWRjM2JhZTgzZCIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE2ODAxODM1ODYsImV4cCI6MTY4MDE4NzE4NCwiaWF0IjoxNjgwMTgzNTg2LCJqdGkiOiI3Yzk4MGM4NC0yZTRmLTQ4MmMtYjY5Zi0zNTU2MjRkM2M3OWMiLCJ1c2VybmFtZSI6ImRhdmVkZXY0MTgifQ.Yh5HfrdxebP9QpLH0i3ivbIHmaiAgootXdxD3Oq2E8u0BNrhF87eha44rbOB4MXILAeBTroDXEMvB4i0rrNnbrp8i3TBelgCqQ4c_0NnIj58IdssRitjULEfCcTPoIHxAwoe_-O-CBnIICgzGYtU2MFBiEZb1YAVbNYwJMI1a2RItTe2GdtxNggeJOPQsy5ZHifEZsVbi71fKbSs2WI9LtaSxHRm6ifmtDJ63UJtc7XKiTBOPrEtjGGZyb0IJGVLoC7TARaYAeF3UR-9lJ6Fr2aJZHpjE5K_WBVTpV7W_iis4M3D8dKyVX7J4hFe2aFqZyHz7HPap9QYd4M2lbr6Hg';

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
    alert('fetchings');
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
    alert(`results username ${result.data.fields.items[0].id}`);
    console.log(result);
    alert(result);
    return result.data.fields.items[0].id;
}
export default async function postJobs(jobsJSON, username) {
    const userId = await getUserByUsername('davedev322');
    alert('here entry');
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
                {
                    "title": "Torc Job",
                    "companyName": "Company 2",
                    "startDate": "2005-01-01T05:00:00.000Z",
                    "endDate": "2004-01-01T05:00:00.000Z",
                    "format": "FULLTIME",
                    "locationType": "ONSITE",
                    "stack": "javascript,  node..JS",
                    "description": ""
                }
            ]
        }
    }
}
 `;
    alert('here b');

    console.log(updateUserMutation);
    alert('fetchings');
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
    alert('results');
    console.log(result);
    alert(result);
}
