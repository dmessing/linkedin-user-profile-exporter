/**
 * @preserve
 * @author Joshua Tzucker
 * @license MIT
 * WARNING: This tool is not affiliated with LinkedIn in any manner. Intended use is to export your own profile data, and you, as the user, are responsible for using it within the terms and services set out by LinkedIn. I am not resonsible for any misuse, or reprecussions of said misuse.
 */

/**
 * @typedef {import("../jsonresume.schema").ResumeSchema & Partial<import('../jsonresume.schema.beyond').ResumeSchemaBeyondCurrentSpec>} ResumeSchema
 */

// ==Bookmarklet==
// @name linkedin-to-jsonresume-bookmarklet
// @author Joshua Tzucker
// ==/Bookmarklet==

/** @type {ResumeSchema} */
const resumeJsonTemplate = {
    $schema: 'https://json.schemastore.org/resume',
    basics: {
        name: '',
        label: '',
        image: '',
        email: '',
        phone: '',
        url: '',
        summary: '',
        location: {
            address: '',
            postalCode: '',
            city: '',
            countryCode: '',
            region: ''
        },
        profiles: []
    },
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: []
};

// @ts-ignore
window.LinkedinToResumeJson = (() => {
    // private
    /** @type {{[key: number]: number}} */
    const maxDaysOfMonth = {
        1: 31,
        2: 28,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31
    };

    /**
     * Checks if value passed is a one digit number
     * @param {Number} v
     */
    const isOneDigit = (v) => Number(v) < 10;

    /**
     * Returns month. If it is only one digit, adds a 0 and returns it as a string.
     * @param {Number} [m] month
     */
    const getMonth = (m) => {
        if (!m) return 12;
        if (isOneDigit(m)) {
            return `0${m}`;
        }
        return m;
    };

    /**
     * Gets day.
     * @param {Number} d day
     * @param {Number} m month
     */
    const getDay = (d, m) => {
        if (!d) {
            if (!m) return 31;
            return maxDaysOfMonth[m];
        }
        if (isOneDigit(d)) {
            return `0${d}`;
        }
        return d;
    };

    /**
     * Parses an object with year, month and day and returns a string with the date.
     * If month is not present, should return 12, and if day is not present, should return last month day.
     * @param {{year: number, month?: number, day?: number}} dateObj
     */
    const parseDate = (dateObj) => (dateObj && dateObj.year ? `${dateObj.year}-${getMonth(dateObj.month)}-${getDay(dateObj.day, dateObj.month)}` : '');

    /** @type {ResumeSchema} */
    let _outputJson = JSON.parse(JSON.stringify(resumeJsonTemplate));
    const _templateJson = resumeJsonTemplate;
    const _liSchemaKeys = {
        profile: '*profile',
        certificates: '*certificationView',
        education: '*educationView',
        workPositions: '*positionView',
        skills: '*skillView',
        projects: '*projectView',
        attachments: '*summaryTreasuryMedias',
        volunteerWork: '*volunteerExperienceView',
        awards: '*honorView',
        publications: '*publicationView'
    };
    const _voyagerBase = 'https://www.linkedin.com/voyager/api';
    const _voyagerEndpoints = {
        following: '/identity/profiles/{profileId}/following',
        followingCompanies: '/identity/profiles/{profileId}/following?count=10&entityType=COMPANY&q=followedEntities',
        contactInfo: '/identity/profiles/{profileId}/profileContactInfo',
        basicAboutMe: '/me',
        advancedAboutMe: '/identity/profiles/{profileId}',
        fullProfileView: '/identity/profiles/{profileId}/profileView',
        fullSkills: '/identity/profiles/{profileId}/skillCategory',
        recommendations: '/identity/profiles/{profileId}/recommendations'
    };
    let _scrolledToLoad = false;
    const _toolPrefix = 'jtzLiToResumeJson';
    const _stylesInjected = false;

    /**
     * Get a cookie by name
     * @param {string} name
     */
    function getCookie(name) {
        const v = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
        return v ? v[2] : null;
    }

    /**
     * Replace a value with a default if it is null or undefined
     * @param {any} value
     * @param {any} [optDefaultVal]
     */
    function noNullOrUndef(value, optDefaultVal) {
        const defaultVal = optDefaultVal || '';
        return typeof value === 'undefined' || value === null ? defaultVal : value;
    }

    /**
     * Builds a mini-db out of a LI schema obj
     * @param {LiResponse} schemaJson
     * @returns {InternalDb}
     */
    function buildDbFromLiSchema(schemaJson) {
        /** @type {Partial<InternalDb> & Pick<InternalDb, 'data'>} */
        const template = {
            /** @type {InternalDb['data']} */
            data: {}
        };
        const db = template;
        db.tableOfContents = schemaJson.data;
        for (let x = 0; x < schemaJson.included.length; x++) {
            /** @type {LiEntity & {key: string}} */
            const currRow = {
                key: schemaJson.included[x].entityUrn,
                ...schemaJson.included[x]
            };
            db.data[currRow.entityUrn] = currRow;
        }
        delete db.tableOfContents['included'];
        /**
         * Get list of element keys (if applicable)
         *  - Certain LI responses will contain a list of keys that correspond to
         * entities via an URN mapping. I think these are in cases where the response
         * is returning a mix of entities, both directly related to the inquiry and
         * tangentially (e.g. `book` entities and `author` entities, return in the
         * same response). In this case, `elements` are those that directly satisfy
         *  the request, and the other items in `included` are those related
         * @returns {string[]}
         */
        db.getElementKeys = function getElementKeys() {
            /** @type {string[]} */
            const searchKeys = ['*elements', 'elements'];
            for (let x = 0; x < searchKeys.length; x++) {
                const key = searchKeys[x];
                const matchingArr = db.tableOfContents[key];
                if (Array.isArray(matchingArr)) {
                    return matchingArr;
                }
            }
            return [];
        };
        db.getValuesByKey = function getValuesByKey(key, optTocValModifier) {
            const values = [];
            let tocVal = this.tableOfContents[key];
            if (typeof optTocValModifier === 'function') {
                tocVal = optTocValModifier(tocVal);
            }
            // tocVal will usually be a single string that is a key to another lookup. In rare cases, it is an array of direct keys
            let matchingDbIndexs = [];
            // Array of direct keys to sub items
            if (Array.isArray(tocVal)) {
                matchingDbIndexs = tocVal;
            }
            // String pointing to sub item
            else if (tocVal) {
                const subToc = this.data[tocVal];
                // Needs secondary lookup if has elements property with list of keys pointing to other sub items
                if (subToc['*elements'] && Array.isArray(subToc['*elements'])) {
                    matchingDbIndexs = subToc['*elements'];
                }
                // Sometimes they use 'elements' instead of '*elements"...
                else if (subToc['elements'] && Array.isArray(subToc['elements'])) {
                    matchingDbIndexs = subToc['elements'];
                } else {
                    // The object itself should be the return row
                    values.push(subToc);
                }
            }
            for (let x = 0; x < matchingDbIndexs.length; x++) {
                if (typeof this.data[matchingDbIndexs[x]] !== 'undefined') {
                    values.push(this.data[matchingDbIndexs[x]]);
                }
            }
            return values;
        };
        // @ts-ignore
        return db;
    }

    /**
     * Gets the profile ID from embedded (or api returned) Li JSON Schema
     * @param {LiResponse} jsonSchema
     * @returns {string} profileId
     */
    function getProfileIdFromLiSchema(jsonSchema) {
        let profileId = '';
        // miniprofile is not usually in the TOC, nor does its entry have an entityUrn for looking up (it has objectUrn), so best solution is just to iterate through all entries checking for match.
        if (jsonSchema.included && Array.isArray(jsonSchema.included)) {
            for (let x = 0; x < jsonSchema.included.length; x++) {
                const currEntity = jsonSchema.included[x];
                // Test for miniProfile match
                if (typeof currEntity['publicIdentifier'] === 'string') {
                    profileId = currEntity.publicIdentifier;
                }
            }
        }
        return profileId.toString();
    }

    /**
     * Push a new skill to the resume object
     * @param {string} skillName
     */
    function pushSkill(skillName) {
        // Try to prevent duplicate skills
        const skillNames = _outputJson.skills.map((skill) => skill.name);
        if (skillNames.indexOf(skillName) === -1) {
            _outputJson.skills.push({
                name: skillName,
                level: '',
                keywords: []
            });
        }
    }

    /**
     *
     * @param {any} instance
     * @param {LiResponse} json
     */
    function parseProfileSchemaJSON(instance, json) {
        let profileParseSuccess = false;
        const _this = instance;
        let foundGithub = false;
        const foundPortfolio = false;
        try {
            const db = buildDbFromLiSchema(json);
            // Parse basics / profile
            let profileGrabbed = false;
            db.getValuesByKey(_liSchemaKeys.profile).forEach((profile) => {
                // There should only be one
                if (!profileGrabbed) {
                    profileGrabbed = true;
                    _outputJson.basics.name = `${profile.firstName} ${profile.lastName}`;
                    _outputJson.basics.summary = noNullOrUndef(profile.summary);
                    _outputJson.basics.label = noNullOrUndef(profile.headline);
                    if (profile.address) {
                        _outputJson.basics.location.address = noNullOrUndef(profile.address);
                    } else if (profile.locationName) {
                        _outputJson.basics.location.address = noNullOrUndef(profile.locationName);
                    }
                    _outputJson.basics.location.countryCode = profile.defaultLocale.country;
                    _outputJson.languages.push({
                        language: profile.defaultLocale.language,
                        fluency: 'Native Speaker'
                    });
                }
            });

            // Parse attachments / portfolio links
            db.getValuesByKey(_liSchemaKeys.attachments).forEach((attachment) => {
                let captured = false;
                const { url } = attachment.data;
                if (attachment.providerName === 'GitHub' || /github\.com/gim.test(url)) {
                    const usernameMatch = /github\.com\/([^\/\?]+)[^\/]+$/gim.exec(url);
                    if (usernameMatch && !foundGithub) {
                        foundGithub = true;
                        captured = true;
                        _outputJson.basics.profiles.push({
                            network: 'GitHub',
                            username: usernameMatch[1],
                            url
                        });
                    }
                }
                // Since most people put potfolio as first link, guess that it will be
                if (!captured && !foundPortfolio) {
                    captured = true;
                    _outputJson.basics.url = url;
                }
                // Finally, put in projects if not yet categorized
                if (!captured && _this.exportBeyondSpec) {
                    captured = true;
                    _outputJson.projects = _outputJson.projects || [];
                    _outputJson.projects.push({
                        name: attachment.title,
                        startDate: '',
                        endDate: '',
                        description: attachment.description,
                        url
                    });
                }
            });

            // Parse education
            db.getValuesByKey(_liSchemaKeys.education).forEach((edu) => {
                /** @type {ResumeSchema['education'][0]} */
                const parsedEdu = {
                    institution: noNullOrUndef(edu.schoolName),
                    area: noNullOrUndef(edu.fieldOfStudy),
                    studyType: noNullOrUndef(edu.degreeName),
                    startDate: '',
                    endDate: '',
                    gpa: noNullOrUndef(edu.grade),
                    courses: []
                };
                if (edu.timePeriod && typeof edu.timePeriod === 'object') {
                    if (edu.timePeriod.startDate && typeof edu.timePeriod.startDate === 'object') {
                        parsedEdu.startDate = parseDate(edu.timePeriod.startDate);
                    }
                    if (edu.timePeriod.endDate && typeof edu.timePeriod.endDate === 'object') {
                        parsedEdu.endDate = parseDate(edu.timePeriod.endDate);
                    }
                }
                if (Array.isArray(edu.courses)) {
                    // Lookup course names
                    edu.courses.forEach((courseKey) => {
                        const courseInfo = db.data[courseKey];
                        if (courseInfo) {
                            parsedEdu.courses.push(`${courseInfo.number} - ${courseInfo.name}`);
                        } else {
                            _this.debugConsole.warn('could not find course:', courseKey);
                        }
                    });
                }
                // Push to final json
                _outputJson.education.push(parsedEdu);
            });

            // Parse work
            db.getValuesByKey(_liSchemaKeys.workPositions).forEach((position) => {
                /** @type {ResumeSchema['work'][0]} */
                const parsedWork = {
                    name: position.companyName,
                    endDate: '',
                    highlights: [],
                    position: position.title,
                    startDate: '',
                    summary: position.description,
                    url: _this.companyLiPageFromCompanyUrn(position['companyUrn'])
                };
                if (position.timePeriod && typeof position.timePeriod === 'object') {
                    if (position.timePeriod.endDate && typeof position.timePeriod.endDate === 'object') {
                        parsedWork.endDate = parseDate(position.timePeriod.endDate);
                    }
                    if (position.timePeriod.startDate && typeof position.timePeriod.startDate === 'object') {
                        parsedWork.startDate = parseDate(position.timePeriod.startDate);
                    }
                }
                // Lookup company website
                if (position.company && position.company['*miniCompany']) {
                    // @TODO - website is not in schema. Use voyager?
                    // let companyInfo = db.data[position.company['*miniCompany']];
                }

                // Push to final json
                _outputJson.work.push(parsedWork);
            });

            // Parse volunteer experience
            db.getValuesByKey(_liSchemaKeys.volunteerWork).forEach((volunteering) => {
                /** @type {ResumeSchema['volunteer'][0]} */
                const parsedVolunteerWork = {
                    organization: volunteering.companyName,
                    position: volunteering.role,
                    url: _this.companyLiPageFromCompanyUrn(volunteering['companyUrn']),
                    startDate: '',
                    endDate: '',
                    summary: volunteering.description,
                    highlights: []
                };
                if (volunteering.timePeriod && typeof volunteering.timePeriod === 'object') {
                    if (typeof volunteering.timePeriod.endDate === 'object' && volunteering.timePeriod.endDate !== null) {
                        parsedVolunteerWork.endDate = parseDate(volunteering.timePeriod.endDate);
                    }
                    if (typeof volunteering.timePeriod.startDate === 'object' && volunteering.timePeriod.startDate !== null) {
                        parsedVolunteerWork.startDate = parseDate(volunteering.timePeriod.startDate);
                    }
                }

                // Push to final json
                _outputJson.volunteer.push(parsedVolunteerWork);
            });

            /**
             * Parse certificates
             *  - NOTE: This is not currently supported by the official JSON Resume spec,
             * so this is hidden behind the exportBeyondSpec setting / flag.
             *  - Once JSON Resume adds a certificate section to the offical specs,
             * this should be moved out and made automatic
             * @see https://github.com/jsonresume/resume-schema/pull/340
             */
            if (_this.exportBeyondSpec) {
                _outputJson.certificates = [];
                db.getValuesByKey(_liSchemaKeys.certificates).forEach((cert) => {
                    /** @type {ResumeSchema['certificates'][0]} */
                    const certObj = {
                        title: cert.name,
                        issuer: cert.authority
                    };
                    if (typeof cert.timePeriod === 'object' && cert.timePeriod.startDate) {
                        certObj.date = parseDate(cert.timePeriod.startDate);
                    }
                    if (typeof cert.url === 'string' && cert.url) {
                        certObj.url = cert.url;
                    }
                    _outputJson.certificates.push(certObj);
                });
            }

            // Parse skills
            /** @type {string[]} */
            const skillArr = [];
            db.getValuesByKey(_liSchemaKeys.skills).forEach((skill) => {
                skillArr.push(skill.name);
            });
            document.querySelectorAll('span[class*="skill-category-entity"][class*="name"]').forEach((skillNameElem) => {
                // @ts-ignore
                const skillName = skillNameElem.innerText;
                if (!skillArr.includes(skillName)) {
                    skillArr.push(skillName);
                }
            });
            skillArr.forEach((skillName) => {
                pushSkill(skillName);
            });

            // Parse projects
            // Not currently used by Resume JSON
            if (_this.exportBeyondSpec) {
                _outputJson.projects = _outputJson.projects || [];
                db.getValuesByKey(_liSchemaKeys.projects).forEach((project) => {
                    const parsedProject = {
                        name: project.title,
                        startDate: '',
                        summary: project.description,
                        url: project.url
                    };
                    if (project.timePeriod && typeof project.timePeriod === 'object') {
                        parsedProject.startDate = parseDate(project.timePeriod.startDate);
                    }
                    _outputJson.projects.push(parsedProject);
                });
            }

            // Parse awards
            db.getValuesByKey(_liSchemaKeys.awards).forEach((award) => {
                const parsedAward = {
                    title: award.title,
                    date: '',
                    awarder: award.issuer,
                    summary: noNullOrUndef(award.description)
                };
                if (award.issueDate && typeof award.issueDate === 'object') {
                    parsedAward.date = parseDate(award.issueDate);
                }
                _outputJson.awards.push(parsedAward);
            });

            // Parse publications
            db.getValuesByKey(_liSchemaKeys.publications).forEach((publication) => {
                const parsedPublication = {
                    name: publication.name,
                    publisher: publication.publisher,
                    releaseDate: '',
                    website: noNullOrUndef(publication.url),
                    summary: noNullOrUndef(publication.description)
                };
                if (typeof publication.date === 'object' && typeof publication.date.year !== 'undefined') {
                    parsedPublication.releaseDate = parseDate(publication.date);
                }
                _outputJson.publications.push(parsedPublication);
            });

            if (_this.debug) {
                console.group('parseProfileSchemaJSON complete:');
                console.log({
                    db,
                    _outputJson
                });
                console.groupEnd();
            }

            _this.parseSuccess = true;
            profileParseSuccess = true;
        } catch (e) {
            if (_this.debug) {
                console.group('Error parsing profile schema');
                console.log(e);
                console.log('Instance');
                console.log(_this);
                console.groupEnd();
            }
            profileParseSuccess = false;
        }
        return profileParseSuccess;
    }

    /**
     *
     * @param {boolean} [OPT_exportBeyondSpec] - Should the tool export additioanl details, beyond the official JSONResume specifications?
     * @param {boolean} [OPT_debug] - Debug Mode?
     * @param {boolean} [OPT_preferApi] - Prefer Voyager API, rather than DOM scrape?
     * @param {boolean} [OPT_getFullSkills] - Retrieve full skills (behind additional API endpoint), rather than just basics
     */
    function LinkedinToResumeJson(OPT_exportBeyondSpec, OPT_debug, OPT_preferApi, OPT_getFullSkills) {
        const _this = this;
        this.profileId = this.getProfileId();
        /** @type {LiResponse} */
        this.profileObj = {};
        /** @type {string | null} */
        this.lastScannedLocale = null;
        /** @type {string | null} */
        this.preferLocale = null;
        this.scannedPageUrl = '';
        this.parseSuccess = false;
        this.getFullSkills = typeof OPT_getFullSkills === 'boolean' ? OPT_getFullSkills : true;
        this.exportBeyondSpec = typeof OPT_exportBeyondSpec === 'boolean' ? OPT_exportBeyondSpec : false;
        this.preferApi = typeof OPT_preferApi === 'boolean' ? OPT_preferApi : true;
        this.debug = typeof OPT_debug === 'boolean' ? OPT_debug : false;
        if (this.debug) {
            console.warn('LinkedinToResumeJson - DEBUG mode is ON');
        }
        this.debugConsole = {
            /** @type {(...args: any[]) => void} */
            log: (...args) => {
                if (_this.debug) {
                    console.log.apply(null, args);
                }
            },
            /** @type {(...args: any[]) => void} */
            warn: (...args) => {
                if (_this.debug) {
                    console.warn.apply(null, args);
                }
            },
            /** @type {(...args: any[]) => void} */
            error: (...args) => {
                if (_this.debug) {
                    console.error.apply(null, args);
                }
            }
        };
    }

    LinkedinToResumeJson.prototype.parseEmbeddedLiSchema = function parseEmbeddedLiSchema() {
        const _this = this;
        let doneWithBlockIterator = false;
        let foundSomeSchema = false;
        const possibleBlocks = document.querySelectorAll('code[id^="bpr-guid-"]');
        for (let x = 0; x < possibleBlocks.length; x++) {
            const currSchemaBlock = possibleBlocks[x];
            // Check if current schema block matches profileView
            if (/educationView/.test(currSchemaBlock.innerHTML) && /positionView/.test(currSchemaBlock.innerHTML)) {
                try {
                    const embeddedJson = JSON.parse(currSchemaBlock.innerHTML);
                    // Due to SPA nature, tag could actually be for profile other than the one currently open
                    const desiredProfileId = _this.getProfileId();
                    const schemaProfileId = getProfileIdFromLiSchema(embeddedJson);
                    if (schemaProfileId === desiredProfileId) {
                        doneWithBlockIterator = true;
                        foundSomeSchema = true;
                        const profileParserResult = parseProfileSchemaJSON(_this, embeddedJson);
                        _this.debugConsole.log(`Parse from embedded schema, success = ${profileParserResult}`);
                        if (profileParserResult) {
                            this.profileObj = embeddedJson;
                        }
                    } else {
                        _this.debugConsole.log(`Valid schema found, but schema profile id of "${schemaProfileId}" does not match desired profile ID of "${desiredProfileId}".`);
                    }
                } catch (e) {
                    if (_this.debug) {
                        throw e;
                    }
                    console.warn(e);
                    console.log('Could not parse embedded schema!');
                }
            }
            if (doneWithBlockIterator) {
                _this.parseSuccess = true;
                break;
            }
        }
        if (!foundSomeSchema) {
            _this.debugConsole.warn('Failed to find any embedded schema blocks!');
        }
    };

    // This should be called every time
    LinkedinToResumeJson.prototype.parseBasics = function parseBasics() {
        this.profileId = this.getProfileId();
        _outputJson.basics.profiles.push({
            network: 'LinkedIn',
            username: this.profileId,
            url: `https://www.linkedin.com/in/${this.profileId}/`
        });
    };

    LinkedinToResumeJson.prototype.parseViaInternalApiFullProfile = async function parseViaInternalApiFullProfile() {
        try {
            // Get full profile
            const fullProfileView = await this.voyagerFetch(_voyagerEndpoints.fullProfileView);
            if (fullProfileView && typeof fullProfileView.data === 'object') {
                // Try to use the same parser that I use for embedded
                const profileParserResult = parseProfileSchemaJSON(this, fullProfileView);
                if (profileParserResult) {
                    this.profileObj = fullProfileView;
                    this.debugConsole.log('Was able to parse full profile via internal API');
                }
                this.debugConsole.log(_outputJson);
                return true;
            }
        } catch (e) {
            console.warn(e);
            console.log('Error parsing using internal API (Voyager) - FullProfile');
        }
        return false;
    };

    LinkedinToResumeJson.prototype.parseViaInternalApiFullSkills = async function parseViaInternalApiFullSkills() {
        try {
            const fullSkillsInfo = await this.voyagerFetch(_voyagerEndpoints.fullSkills);
            if (fullSkillsInfo && typeof fullSkillsInfo.data === 'object') {
                if (Array.isArray(fullSkillsInfo.included)) {
                    for (let x = 0; x < fullSkillsInfo.included.length; x++) {
                        const skillObj = fullSkillsInfo.included[x];
                        if (typeof skillObj.name === 'string') {
                            pushSkill(skillObj.name);
                        }
                    }
                }
                return true;
            }
        } catch (e) {
            console.warn(e);
            console.log('Error parsing using internal API (Voyager) - FullSkills');
        }
        return false;
    };

    LinkedinToResumeJson.prototype.parseViaInternalApiContactInfo = async function parseViaInternalApiContactInfo() {
        try {
            const contactInfo = await this.voyagerFetch(_voyagerEndpoints.contactInfo);
            if (contactInfo && typeof contactInfo.data === 'object') {
                const { websites, twitterHandles, phoneNumbers, emailAddress } = contactInfo.data;
                _outputJson.basics.location.address = noNullOrUndef(contactInfo.data.address, _outputJson.basics.location.address);
                _outputJson.basics.email = noNullOrUndef(emailAddress, _outputJson.basics.email);
                if (phoneNumbers && phoneNumbers.length) {
                    _outputJson.basics.phone = noNullOrUndef(phoneNumbers[0].number);
                }

                // Scrape Websites
                if (Array.isArray(websites)) {
                    for (let x = 0; x < websites.length; x++) {
                        if (/portfolio/i.test(websites[x].type.category)) {
                            _outputJson.basics.url = websites[x].url;
                        }
                    }
                }

                // Scrape Twitter
                if (Array.isArray(twitterHandles)) {
                    twitterHandles.forEach((handleMeta) => {
                        const handle = handleMeta.name;
                        _outputJson.basics.profiles.push({
                            network: 'Twitter',
                            username: handle,
                            url: `https://twitter.com/${handle}`
                        });
                    });
                }
                return true;
            }
        } catch (e) {
            console.warn(e);
            console.log('Error parsing using internal API (Voyager) - Contact Info');
        }
        return false;
    };

    LinkedinToResumeJson.prototype.parseViaInternalApiBasicAboutMe = async function parseViaInternalApiBasicAboutMe() {
        try {
            const basicAboutMe = await this.voyagerFetch(_voyagerEndpoints.basicAboutMe);
            if (basicAboutMe && typeof basicAboutMe.data === 'object') {
                if (Array.isArray(basicAboutMe.included) && basicAboutMe.included.length > 0) {
                    const data = basicAboutMe.included[0];
                    _outputJson.basics.name = `${data.firstName} ${data.LastName}`;
                    // Note - LI labels this as "occupation", but it is basically the callout that shows up in search results and is in the header of the profile
                    _outputJson.basics.label = data.occupation;
                    _outputJson.basics.image = data.picture.rootUrl + data.picture.artifacts[data.picture.artifacts.length - 1].fileIdentifyingUrlPathSegment;
                }
                return true;
            }
        } catch (e) {
            console.warn(e);
            console.log('Error parsing using internal API (Voyager) - Basic About Me');
        }
        return false;
    };

    LinkedinToResumeJson.prototype.parseViaInternalApiAdvancedAboutMe = async function parseViaInternalApiAdvancedAboutMe() {
        try {
            const advancedAboutMe = await this.voyagerFetch(_voyagerEndpoints.advancedAboutMe);
            if (advancedAboutMe && typeof advancedAboutMe.data === 'object') {
                const { data } = advancedAboutMe;
                _outputJson.basics.name = `${data.firstName} ${data.lastName}`;
                _outputJson.basics.label = data.headline;
                _outputJson.basics.summary = data.summary;
                return true;
            }
        } catch (e) {
            console.warn(e);
            console.log('Error parsing using internal API (Voyager) - AdvancedAboutMe');
        }
        return false;
    };

    LinkedinToResumeJson.prototype.parseViaInternalApiRecommendations = async function parseViaInternalApiRecommendations() {
        try {
            const recommendationJson = await this.voyagerFetch(`${_voyagerEndpoints.recommendations}?q=received&recommendationStatuses=List(VISIBLE)`);
            // This endpoint return a LI db
            const db = buildDbFromLiSchema(recommendationJson);
            db.getElementKeys().forEach((key) => {
                const elem = db.data[key];
                if (elem && 'recommendationText' in elem) {
                    // Need to do a secondary lookup to get the name of the person who gave the recommendation
                    const recommenderElem = db.data[elem['*recommender']];
                    _outputJson.references.push({
                        name: `${recommenderElem.firstName} ${recommenderElem.lastName}`,
                        reference: elem.recommendationText
                    });
                }
            });
        } catch (e) {
            console.warn(e);
            console.log('Error parsing using internal API (Voyager) - Recommendations');
        }
        return false;
    };

    LinkedinToResumeJson.prototype.parseViaInternalApi = async function parseViaInternalApi() {
        try {
            let apiSuccessCount = 0;
            let fullProfileEndpointSuccess = false;

            fullProfileEndpointSuccess = await this.parseViaInternalApiFullProfile();
            if (fullProfileEndpointSuccess) {
                apiSuccessCount++;
            }

            // Get full skills, behind voyager endpoint
            if (this.getFullSkills && (await this.parseViaInternalApiFullSkills())) {
                apiSuccessCount++;
            }

            // Always get full contact info, behind voyager endpoint
            if (await this.parseViaInternalApiContactInfo()) {
                apiSuccessCount++;
            }

            // References / recommendations should also come via voyager; DOM is extremely unreliable for this
            if (await this.parseViaInternalApiRecommendations()) {
                apiSuccessCount++;
            }

            // Only continue with other endpoints if full profile API failed
            if (!fullProfileEndpointSuccess) {
                if (await this.parseViaInternalApiBasicAboutMe()) {
                    apiSuccessCount++;
                }
                if (await this.parseViaInternalApiAdvancedAboutMe()) {
                    apiSuccessCount++;
                }
            }

            this.debugConsole.log(_outputJson);
            if (apiSuccessCount > 0) {
                this.parseSuccess = true;
            } else {
                this.debugConsole.error('Using internal API (Voyager) failed completely!');
            }
        } catch (e) {
            console.warn(e);
            console.log('Error parsing using internal API (Voyager)');
        }
    };

    /**
     * Trigger AJAX loading of content by scrolling
     * @param {() => any} [callback]
     */
    LinkedinToResumeJson.prototype.triggerAjaxLoadByScrolling = async function triggerAjaxLoadByScrolling(callback) {
        const cb = typeof callback === 'function' ? callback : () => {};
        if (!_scrolledToLoad) {
            // Capture current location
            const startingLocY = window.scrollY;
            // Scroll to bottom
            const scrollToBottom = () => {
                const maxHeight = document.body.scrollHeight;
                window.scrollTo(0, maxHeight);
            };
            scrollToBottom();
            await new Promise((resolve) => {
                setTimeout(() => {
                    scrollToBottom();
                    window.scrollTo(0, startingLocY);
                    _scrolledToLoad = true;
                    resolve();
                    cb();
                }, 400);
            });
        } else {
            cb();
        }
        return true;
    };

    /**
     * Force a re-parse / scrape
     * @param {string} [optLocale]
     */
    LinkedinToResumeJson.prototype.forceReParse = async function forceReParse(optLocale) {
        _scrolledToLoad = false;
        this.parseSuccess = false;
        await this.tryParse(optLocale);
    };

    /**
     * Try to scrape / get API and parse
     * @param {string} [optLocale]
     */
    LinkedinToResumeJson.prototype.tryParse = async function tryParse(optLocale) {
        const _this = this;
        const localeToUse = optLocale || _this.preferLocale;
        const localeStayedSame = !localeToUse || optLocale === _this.lastScannedLocale;
        const localeMatchesUser = !localeToUse || optLocale === _this.getViewersLocalLang();
        _this.preferLocale = localeToUse || null;
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            if (_this.parseSuccess) {
                if (_this.scannedPageUrl === _this.getUrlWithoutQuery() && localeStayedSame) {
                    // No need to reparse!
                    this.debugConsole.log('Skipped re-parse; page has not changed');
                    resolve(true);
                } else {
                    // Parse already done, but page changed (ajax)
                    this.debugConsole.warn('Re-parsing for new results; page has changed between scans');
                    await _this.forceReParse(localeToUse);
                    resolve(true);
                }
            } else {
                _outputJson = JSON.parse(JSON.stringify(_templateJson));
                _this.triggerAjaxLoadByScrolling(async () => {
                    _this.parseBasics();
                    // Embedded schema can't be used for specific locales
                    if (_this.preferApi === false && localeMatchesUser) {
                        _this.parseEmbeddedLiSchema();
                        if (!_this.parseSuccess) {
                            await _this.parseViaInternalApi();
                        }
                    } else {
                        await _this.parseViaInternalApi();
                        if (!_this.parseSuccess) {
                            this.parseEmbeddedLiSchema();
                        }
                    }
                    _this.scannedPageUrl = _this.getUrlWithoutQuery();
                    resolve(true);
                });
            }
        });
    };

    LinkedinToResumeJson.prototype.parseAndShowOutput = async function parseAndShowOutput() {
        await this.tryParse();
        const parsedExport = {
            raw: _outputJson,
            stringified: JSON.stringify(_outputJson, null, 2)
        };
        console.log(parsedExport);
        if (this.parseSuccess) {
            this.showModal(parsedExport.raw);
        } else {
            alert('Could not extract JSON from current page. Make sure you are on a profile page that you have access to');
        }
    };

    LinkedinToResumeJson.prototype.closeModal = function closeModal() {
        const modalWrapperId = `${_toolPrefix}_modalWrapper`;
        const modalWrapper = document.getElementById(modalWrapperId);
        if (modalWrapper) {
            modalWrapper.style.display = 'none';
        }
    };

    /**
     * Show the output modal with the results
     * @param {{[key: string]: any}} jsonResume - JSON Resume
     */
    LinkedinToResumeJson.prototype.showModal = function showModal(jsonResume) {
        const _this = this;
        const modalWrapperId = `${_toolPrefix}_modalWrapper`;
        let modalWrapper = document.getElementById(modalWrapperId);
        if (modalWrapper) {
            modalWrapper.style.display = 'block';
        } else {
            _this.injectStyles();
            modalWrapper = document.createElement('div');
            modalWrapper.id = modalWrapperId;
            modalWrapper.innerHTML = `<div class="${_toolPrefix}_modal">
                <div class="${_toolPrefix}_topBar">
                    <div class="${_toolPrefix}_titleText">Profile Export:</div>
                    <div class="${_toolPrefix}_closeButton">X</div>
                </div>
                <div class="${_toolPrefix}_modalBody">
                    <textarea id="${_toolPrefix}_exportTextField">Export will appear here...</textarea>
                </div>
            </div>`;
            document.body.appendChild(modalWrapper);
            // Add event listeners
            modalWrapper.addEventListener('click', (evt) => {
                // Check if click was on modal content, or wrapper (outside content, to trigger close)
                // @ts-ignore
                if (evt.target.id === modalWrapperId) {
                    _this.closeModal();
                }
            });
            modalWrapper.querySelector(`.${_toolPrefix}_closeButton`).addEventListener('click', () => {
                _this.closeModal();
            });
            /** @type {HTMLTextAreaElement} */
            const textarea = modalWrapper.querySelector(`#${_toolPrefix}_exportTextField`);
            textarea.addEventListener('click', () => {
                textarea.select();
            });
        }
        // Actually set textarea text
        /** @type {HTMLTextAreaElement} */
        const outputTextArea = modalWrapper.querySelector(`#${_toolPrefix}_exportTextField`);
        outputTextArea.value = JSON.stringify(jsonResume, null, 2);
    };

    LinkedinToResumeJson.prototype.injectStyles = function injectStyles() {
        if (!_stylesInjected) {
            const styleElement = document.createElement('style');
            styleElement.innerText = `#${_toolPrefix}_modalWrapper {
                width: 100%;
                height: 100%;
                position: fixed;
                top: 0;
                left: 0;
                background-color: rgba(0, 0, 0, 0.8);
                z-index: 99999999999999999999999999999999
            }
            .${_toolPrefix}_modal {
                width: 80%;
                margin-top: 10%;
                margin-left: 10%;
                background-color: white;
                padding: 20px;
                border-radius: 13px;
            }
            .${_toolPrefix}_topBar {
                width: 100%;
                position: relative;
            }
            .${_toolPrefix}_titleText {
                text-align: center;
                font-size: x-large;
                width: 100%;
                padding-top: 8px;
            }
            .${_toolPrefix}_closeButton {
                position: absolute;
                top: 0px;
                right: 0px;
                padding: 0px 8px;
                margin: 3px;
                border: 4px double black;
                border-radius: 10px;
                font-size: x-large;
            }
            .${_toolPrefix}_modalBody {
                width: 90%;
                margin-left: 5%;
                margin-top: 20px;
                padding-top: 8px;
            }
            #${_toolPrefix}_exportTextField {
                width: 100%;
                min-height: 300px;
            }`;
            document.body.appendChild(styleElement);
        }
    };

    LinkedinToResumeJson.prototype.getUrlWithoutQuery = function getUrlWithoutQuery() {
        return document.location.origin + document.location.pathname;
    };

    LinkedinToResumeJson.prototype.getJSON = function getJSON() {
        if (this.parseSuccess) {
            return _outputJson;
        }

        return _templateJson;
    };

    /**
     * Get the profile ID / User ID of the user by parsing URL first, then page.
     */
    LinkedinToResumeJson.prototype.getProfileId = function getProfileId() {
        let profileId;
        const linkedProfileRegUrl = /linkedin.com\/[^\/]*\/([^\/]+)\/[^\/]*$/im;
        const linkedProfileRegApi = /voyager\/api\/.*\/profiles\/([^\/]+)\/.*/im;
        if (linkedProfileRegUrl.test(document.location.href)) {
            profileId = linkedProfileRegUrl.exec(document.location.href)[1];
        }

        // Fallback to finding in HTML source.
        // Warning: This can get stale between pages, or might return your own ID instead of current profile
        if (!profileId && linkedProfileRegApi.test(document.body.innerHTML)) {
            profileId = linkedProfileRegApi.exec(document.body.innerHTML)[1];
        }

        if (profileId) {
            // In case username contains special characters
            return decodeURI(profileId);
        }

        return false;
    };

    /**
     * Get the local language identifier of the *viewer* (not profile)
     * @returns {string}
     */
    LinkedinToResumeJson.prototype.getViewersLocalLang = () => {
        const metaTag = document.querySelector('meta[name="i18nDefaultLocale"]');
        /** @type {HTMLSelectElement | null} */
        const selectTag = document.querySelector('select#globalfooter-select_language');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        if (selectTag) {
            return selectTag.value;
        }
        // Default to English
        return 'en_US';
    };

    /**
     * Get the locales that the *current* profile (natively) supports (based on `supportedLocales`)
     * @returns {Promise<string[]>}
     */
    LinkedinToResumeJson.prototype.getSupportedLocales = async function getSupportedLocales() {
        /** @type {string[]} */
        let supportedLocales = [];
        await this.tryParse();
        const profileDb = buildDbFromLiSchema(this.profileObj);
        const userDetails = profileDb.getValuesByKey(_liSchemaKeys.profile)[0];
        if (userDetails && Array.isArray(userDetails['supportedLocales'])) {
            supportedLocales = userDetails.supportedLocales.map((locale) => {
                return `${locale.language}_${locale.country}`;
            });
        }
        return supportedLocales;
    };

    /**
     * Retrieve a LI Company Page URL from a company URN
     * @param {string} companyUrn
     */
    LinkedinToResumeJson.prototype.companyLiPageFromCompanyUrn = function companyLiPageFromCompanyUrn(companyUrn) {
        let companyPageUrl = '';
        if (typeof companyUrn === 'string') {
            const companyIdMatch = /urn.+Company:(\d+)/.exec(companyUrn);
            if (companyIdMatch) {
                companyPageUrl = `https://www.linkedin.com/company/${companyIdMatch[1]}`;
            }
        }
        return companyPageUrl;
    };

    /**
     * Special - Fetch with authenticated internal API
     * @param {string} fetchEndpoint
     * @param {Record<string, string | number>} [optHeaders]
     */
    LinkedinToResumeJson.prototype.voyagerFetch = async function voyagerFetch(fetchEndpoint, optHeaders = {}) {
        const _this = this;
        // Macro support
        let endpoint = fetchEndpoint.replace('{profileId}', this.profileId);
        if (!endpoint.startsWith('https')) {
            endpoint = _voyagerBase + endpoint;
        }
        // Set requested language
        let langHeaders = {};
        if (_this.preferLocale) {
            langHeaders = {
                'x-li-lang': _this.preferLocale,
                ...optHeaders
            };
        }
        return new Promise((resolve, reject) => {
            // Get the csrf token - should be stored as a cookie
            const csrfTokenString = getCookie('JSESSIONID').replace(/"/g, '');
            if (csrfTokenString) {
                /** @type {RequestInit} */
                const fetchOptions = {
                    credentials: 'include',
                    headers: {
                        ...langHeaders,
                        ...optHeaders,
                        accept: 'application/vnd.linkedin.normalized+json+2.1',
                        'csrf-token': csrfTokenString,
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'same-origin'
                    },
                    referrer: document.location.href,
                    body: null,
                    method: 'GET',
                    mode: 'cors'
                };
                _this.debugConsole.log(`Fetching: ${endpoint}`, fetchOptions);
                fetch(endpoint, fetchOptions).then((response) => {
                    if (response.status !== 200) {
                        const errStr = 'Error fetching internal API endpoint';
                        reject(new Error(errStr));
                        console.warn(errStr, response);
                    } else {
                        response.text().then((text) => {
                            try {
                                const parsed = JSON.parse(text);
                                resolve(parsed);
                            } catch (e) {
                                console.warn('Error parsing internal API response', response, e);
                                reject(e);
                            }
                        });
                    }
                });
            } else {
                resolve(false);
            }
        });
    };

    return LinkedinToResumeJson;
})();
