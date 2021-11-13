# Setup Google Cloud Text-to-Speech
## Table of content
* [Create a Google Cloud Platform account](#create-a-google-cloud-platform-account)
* [Create a Google Cloud Platform project](#create-a-google-cloud-platform-project)
* [Enable Google Cloud Text-to-Speech](#enable-google-cloud-text-to-speech)
* [Create a Google Cloud Text-to-Speech API key](#create-a-google-cloud-text-to-speech-api-key)


## Create a Google Cloud Platform account
* Go to: [https://cloud.google.com/gcp](https://cloud.google.com/gcp) and click on "Get started for free":

![image](https://user-images.githubusercontent.com/15323067/137848375-bd6811dd-fa22-46a5-81d7-a6c744af37fd.png)

* Sign in with your primary gmail account
* You'll land on a page with several steps you need to complete in order to create your Google Cloud account
* **Step 1** - Select your country then select "Personal Project" as description then continue:

![image](https://user-images.githubusercontent.com/15323067/137991353-5bde8a49-eae9-4f02-afef-1d3db6daa822.png)

* **Step 2** - Verify your account with your phone number then continue
* **Step 3** - Add your billing informations to access Google Cloud services (you won't be charged at any point if you go over the free monthly tier unless you decide to unable billing).

## Create a Google Cloud Platform project
Once your account has been created, create a new project if Google doesn't already ask you to.
* Go to: [https://console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate)
* Set "Izabela TTS" as project name and click create

![image](https://user-images.githubusercontent.com/15323067/139527826-61fd9f5e-5479-4249-8cd3-2c7728903eb9.png)

## Enable Google Cloud Text-to-Speech
Once the project has been created, enable Google Cloud Text-to-Speech for the project.
* Go to: [https://console.cloud.google.com/marketplace/product/google/texttospeech.googleapis.com?project=izabela-tts](https://console.cloud.google.com/marketplace/product/google/texttospeech.googleapis.com?project=izabela-tts)
* Click on "Enable" and make sure "Izabela TTS" is selected at the top

![image](https://user-images.githubusercontent.com/15323067/139528672-fc8693e5-c549-4d86-8972-9c2e76046c03.png)

* If you are asked to select a billing account, select the one you created when you made the account or create a new one then click on "Set Account"

![image](https://user-images.githubusercontent.com/15323067/139528834-66c0da25-a277-497e-b1ee-3e3808c34812.png)


## Create a Google Cloud Text-to-Speech API key
Once Google Cloud Text-to-Speech has been enabled, create an API key that you can use in Izabela.
* Go to: https://console.cloud.google.com/apis/credentials?project=izabela-tts
* Click on "Create Credentials" and then "Create API key" and make sure "Izabela TTS" is selected at the top

![image](https://user-images.githubusercontent.com/15323067/141654899-3ea0b5fe-c776-4850-a732-451b46062614.png)

* You'll see a window appear with your newly created api key. You can now copy the key and paste it in Izabela. 

**NOTE**: An API key should be treated like a password. NEVER share your API key with anyone. If you think your key is compromised, please return to the credentials page, generate a new key and delete the previous one.

![image](https://user-images.githubusercontent.com/15323067/141655040-4275c4a8-7861-4a91-a730-d8a60e528d21.png)
![image](https://user-images.githubusercontent.com/15323067/141655217-c0ae39f5-90c5-4841-b76e-7130369f228f.png)

To test if the key is working, click on the "REFRESH LIST" button next to "Voice". If the list is empty, please retry the steps above as it means there's an issue with the API key. Otherwise everything should be working!



