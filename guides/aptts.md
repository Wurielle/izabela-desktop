# Setup Amazon Polly Text-to-Speech

## Table of content

## Create an Amazon Web Services account
* Go to: [https://aws.amazon.com](https://aws.amazon.com) and click on "Get started for free":

![image](https://user-images.githubusercontent.com/15323067/142482900-cce31fcd-8ccc-4545-96a2-293ff208d366.png)

* You'll land on a page with several steps you need to complete in order to create your Amazon Web Services account. Complete the account creation to proceed.

![image](https://user-images.githubusercontent.com/15323067/142484742-61d18e7f-9334-4dd9-96cb-ab248aa8b714.png)

## Create a Cognito access
Once your account has been created, create a Cognito access to link to Izabela.
* Go to: [https://console.aws.amazon.com/cognito/v2/home](https://console.aws.amazon.com/cognito/v2/home) and click on "Manage Identity Pools"

![image](https://user-images.githubusercontent.com/15323067/142485977-c2f87be6-9bd4-4332-93de-307b2e0fc1fa.png)

You'll land on the Identity pool creation page. On that page:
* Set Izabela TTS as  "Identity pool name"
* Select "Enable access to unauthenticated identities"
* Click "Create pool" to confirm

![image](https://user-images.githubusercontent.com/15323067/142488871-5a0751a3-4ae0-4752-ae43-cd21971c42fc.png)

You'll land on the role creation page for the Identity Pool we just created. On that page:
* Click on "Show details"
* Check that you're creating a new IAM Role called "Cognito_IzabelaTTSUnauth_Role"
* Click "Allow" to confirm

![image](https://user-images.githubusercontent.com/15323067/142490680-7c5c331a-bb7e-466d-a569-85d0c1573435.png)

You'll land on the detail page for the Identity Pool we just created. On that page:
* Select "JavaScript" in "Platform" to show the JavaScript code with our Cognito informations
* Copy the "region" value which should look like `eu-west-2` and paste it in the "Region" field in Izabela
* Copy the "IdentityPoolId" value which should look like `eu-west-2:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` and paste it in the "Identity Pool ID" field in Izabela

![image](https://user-images.githubusercontent.com/15323067/142492229-a7cc1aef-ccf0-4237-80ad-5849fc6e4648.png)
![image](https://user-images.githubusercontent.com/15323067/142492415-a2d3b9ee-a4eb-4af6-bde7-513f1622eb70.png)


## Enable access to Amazon Polly
Once your Cognito access has been created, enable access to Amazon Polly for your Identity Pool.
* Go to: [https://console.aws.amazon.com/iamv2/home?#/roles](https://console.aws.amazon.com/iamv2/home?#/roles) and click on "Cognito_IzabelaTTSUnauth_Role"

![image](https://user-images.githubusercontent.com/15323067/142719893-94f24bce-f2b2-4032-b0f5-5e8f3c980d0a.png)

You'll land on the detail page for the role "Cognito_IzabelaTTSUnauth_Role". On that page:
* Click on "Attach policies"

![image](https://user-images.githubusercontent.com/15323067/142720004-dace8e66-5a73-4e40-9ef5-7ac7d082dcab.png)

You'll land on the policy list page for the role "Cognito_IzabelaTTSUnauth_Role". On that page:
* Search "Polly" to filter the list
* Check "AmazonPollyReadOnlyAccess"
* Click on "Attach policy" to confirm

![image](https://user-images.githubusercontent.com/15323067/142720035-6db46525-e828-470d-a9f5-3b31ae43afdf.png)

After that you should be able to use Amazon Polly in Izabela.

To test if the key is working, click on the "REFRESH LIST" button next to "Voice". If the list is empty, please retry the steps above as it means there's an issue with the API key. Otherwise everything should be working!
