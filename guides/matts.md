# Setup Microsoft Azure Text-to-Speech

## Table of content
* [Create a Microsoft Azure account](#create-a-microsoft-azure-account)
* [Create a Microsoft Azure Resource Group](#create-a-microsoft-azure-resource-group)
* [Create a Microsoft Azure Speech Service](#create-a-microsoft-azure-speech-service)
* [Get your Microsoft Azure API Key](#get-your-microsoft-azure-api-key)

## Create a Microsoft Azure account
* Go to: [https://azure.microsoft.com/en-us/free/cognitive-services](https://azure.microsoft.com/en-us/free/cognitive-services/) and click on "Start free":

![image](https://user-images.githubusercontent.com/15323067/142037871-710efc74-9753-4fba-8aaa-8a2663e04f4d.png)

* Sign in with your Microsoft Account (or create one if you don't have any)

![image](https://user-images.githubusercontent.com/15323067/142038766-ffbd777c-f420-4413-9b94-41ae6c282774.png)

* You'll land on a page with several steps you need to complete in order to create your Microsoft Azure account. Complete the account creation to proceed.

![image](https://user-images.githubusercontent.com/15323067/142039140-446b1e9f-e357-4a15-a341-416eafb799a7.png)

## Create a Microsoft Azure Resource Group
* Go to: [https://portal.azure.com](https://portal.azure.com) and click on "Resource groups" to create a new ressource group

![image](https://user-images.githubusercontent.com/15323067/142041781-8335c57f-4bec-42f3-bc99-ffba9f104312.png)

* Create a new resource group called "Izabela-TTS" and select the region closest to you then click "Create"

![image](https://user-images.githubusercontent.com/15323067/142042251-47b773cf-e749-4dd8-81ef-4bc0a0b8d66e.png)
![image](https://user-images.githubusercontent.com/15323067/142043574-8ea43ae0-e71e-40a0-be9e-0c40cf1af172.png)
![image](https://user-images.githubusercontent.com/15323067/142043922-cc2b17eb-c230-4e5f-bbe0-6ee81848fe4c.png)

## Create a Microsoft Azure Speech Service
Once a resources group has been created, create a Speech Service for that account.
* Go to: [https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices](https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices)
* Select the resource group that we just created
* Select the region closest to you
* Set "Izabela-TTS" as name
* Select the free tier
* Click on "Review + create" then "Create"

![image](https://user-images.githubusercontent.com/15323067/142045949-068d849c-1426-49f6-96f1-5089facb54db.png)
![image](https://user-images.githubusercontent.com/15323067/142046182-fc55b430-70de-4b1c-bf22-acc7fa92e2c1.png)


## Get your Microsoft Azure API Key
Once a speech service has been created, get your Microsoft Azure API key.
* Go to: [https://portal.azure.com/#blade/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/SpeechServices](https://portal.azure.com/#blade/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/SpeechServices) and click on the speech service you just created

![image](https://user-images.githubusercontent.com/15323067/142048692-3f52942c-9ca1-4363-ab32-85c606f0dc20.png)

* You'll land on the detail page of your speech service. From there, click on "Click here to manage keys" to get your speech service keys

![image](https://user-images.githubusercontent.com/15323067/142050150-493f3291-59f2-46f4-ba94-805d8a72316d.png)

* Copy the **API key** and the **Location/Region** and paste them into Izabela

![image](https://user-images.githubusercontent.com/15323067/142050443-2d09c421-5a0e-40f9-8c14-679dc41b9d2a.png)
![image](https://user-images.githubusercontent.com/15323067/142050579-12c9c590-21d6-47d7-b8f2-59bb7866d6c2.png)

To test if the key is working, click on the "REFRESH LIST" button next to "Voice". If the list is empty, please retry the steps above as it means there's an issue with the API key. Otherwise everything should be working!
