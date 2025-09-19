 I want to create a blog writer automation. 
 The writer will have the following scripts that can be run one by one, and can work independent of each other too. 

At the beginning of the the project a folder with the company name will be created. All data will be added to this folder.

## 1. Writing Instructions creation script
This script will visit the company website as input by the user. And scrape all the necessary details that are required to fill the @sample-writing-instructions.json template. 

Then a {company name}-blogwritinginstructions.json file will be created.

## 2. Sitemap creator script
Scrape the website and create a detailed sitemap of the website.
Add the sitemap urls to a {company name}-sitemap file

## 3. Internal Link Creator script
Analyse each URL from the {company name}-sitemap file. Add a note against each url to inform the Blog Editor Script about when that URL can be used for Internal Links. 
output will be {company name}-internal-links.json file

## 4. Keyword Generation Script
Use DataforSEO to generate a list of keywords following these instructions:
1. Always get long tail keywords that are of suitable competition level.
2. When checking for competition level of keywords , first analyse the website keywords, and their level of competition. The keywords should be around the same or slightly higher competition level as the website keywords.
3. Generate a topic and cluster keywords under a topic. Ensure clustering of keywords is done using SERP occurance analysis.
4. Create a {company name}-Keywords-topics file with a list of topics and associated keywords for the topic (based on the clustering algorithm).

## 5. Blog Writer Script
Present 3 topics from the {company name}-Keywords-topics file for user selection. User will select one topic.
Use the {company name}-blogwritinginstructions.json, SEO_BEST_PRACTICES.md, internal-links.json, and writing-best-practises.md file to get the direction to write a well crafted blog article.
The output should be in markdown format.

## 6. Blog Editing Script
One by one check if all the instructions and guidelines from {company name}-blogwritinginstructions.json, SEO_BEST_PRACTICES.md, {company name}-internal-links.json, and writing-best-practises.md.
If not followed, edit the blog article and fix it.