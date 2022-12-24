# Ribbon
Ribbon is the codename for the API used on [www.thisisrc.org]thisisrc.org. Ribbon is written in Express using TypeScript.

## Routes

### /api/test
Can be used to test if the API is on and working. Returns
```json
{api: true}
```

### /schools/add
Adds a school. Takes four inputs: 
```js
contact_name
contact_email
contact_position
name
```

### /schools/:code
Gets a school by code. Takes the school code as input and returns a JSON object with ObjectId and all school fields.

### /students/add
Adds a student. Takes 8 inputs:
```js
contact_name
contact_email
contact_position
project_type
project_title
project_description
project_discipline
school
```