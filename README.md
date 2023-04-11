# Serverless Application Model 8 Ball Example

This is a sample of the Serverless Application Model that deviates from the traditional "Hello World" as instead it returns JSON formatted magical predictions.

This README will guide you through AWS-SAM-CLI setup, account permissions, and then a quick hands-on introduction to using the SAM CLI to give you an idea of what SAM has to offer and how easy it can be to implement.

It will not get into creating templates, adding data storage, or all the cool things you can do. Instead it will focus on building and deploying stacks from the CLI which is a great introduction that will give you a sense of accomplishment! (As well as a fun, interactive, instructional app that is much better than staring at a static display of "Hello World").

To start building your own SAM applications and to learn the concepts behind what is demonstrated here, I recommend _Running Serverless_ by Gojko Adzic.

## Set Up Local Machine

AWS SAM CLI extends the AWS CLI, so if you already have AWS CLI installed, you may be able to skip a few steps.

The following steps are taken from chapter 2 of _Running Serverless_ by Gojko Adzic.

### Python

Check Python to make sure it is installed.

`python --version`

If it is not installed, go to the Python website for instructions: <https://www.python.org>

### PIP

Do same with pip

`pip --version`

<https://pip.pypa.io>

### AWS CLI

`aws --version`

Install version 2: <https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html>

More info: <https://docs.aws.amazon.com/cli>

### Docker

`docker --version`

Install Docker to simulate the Lambda execution environment. The free community Docker Desktop tools is all you need for local testing.

<https://www.docker.com/products/docker-desktop>

NOTE: Docker will not run on Windows 10 Home Edition.

### Node

`node --version`

<https://nodejs.org>

I recommend 14 or later. As of 2/3/2021, version 14 is supported by Lambda. Make sure the version you plan on using is set in _template.yml_.

### SAM Command Line Tools

#### Homebrew

`brew tap aws/tap`
`brew install aws-sam-cli`

#### Non-Homebrew

`pip install aws-sam-cli`

#### Verify

After install:

`sam --version`

And you should get something like: `SAM CLI, version 1.78.0`

## Set up your access credentials

AWS SAM CLI uses the same credentials from AWS CLI. You can skip this step if you are already using AWS CLI to access your AWS resources.

You will need an access key ID and secret key ID (Note: For enterprise managed accounts this is set up differently)

Note that there are many ways to do this so that the IAM user has restricted access. If you are on your personal account the following steps are okay. After all, you are master of your own domain. If you are on an organizationl account where changes will impact other projects and people, follow the practices of your IT org.

The following steps are (for the most part) taken from chapter 2 of _Running Serverless_ by Gojko Adzic. For any alternate steps, or troubleshooting, I would refer you to the book.

1. Sign into the AWS Web Console at <https://aws.amazon.com>
2. Select the IAM service
3. In the left-hand IAM menu, select Users
4. Click on the Add User button
5. On the next screen, enter a name for the user account then, in the "Select AWS access type" section, select Programmatic acccess.
6. Click the Next button to assign permissions, then select Attach existing policies directly
7. In the list of policies, find the PowerUserAccess and IAMFullAccess policies and tick the check boxes next to them
8. You can skip the remaining wizard steps.
9. The final page will show you the access key ID and show a link to reveal the secret key. Reveal the secret key and copy both keys somewhere.

Once you have the keys run the following: `aws configure`

Paste in the keys when prompted. For region use `us-east-2` or whatever your default region should be. For default output use `json` or press Enter to keep it unset.

Check it out: `aws sts get-caller-identity`

## Once you have a user account

Make sure your role has the following permissions:

- arn:aws:iam::aws:policy/AWSLambdaFullAccess
- arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator
- arn:aws:iam::aws:policy/CustomPolicySAM

AWSLambdaFullAccess and AmazonAPIGatewayAdministrator are AWS Managed policies. Create the CustomPolicySAM with the following:

```JSON
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "SAMIAMPolicies",
            "Effect": "Allow",
            "Action": [
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:GetRole",
                "iam:DeleteRole",
                "iam:TagPolicy",
                "iam:TagRole",
                "iam:UntagPolicy",
                "iam:UntagRole"
            ],
            "Resource": "arn:aws:iam::*:role/sam-*"
        },
        {
            "Sid": "SAMPassRolePolicy",
            "Effect": "Allow",
            "Action": [
                "iam:PassRole"
            ],
            "Resource": "arn:aws:iam::*:role/sam-*",
            "Condition": {
                "StringEquals": { 
                    "iam:PassedToService": "lambda.amazonaws.com"
                },
                "ArnLike": {
                    "iam:AssociatedResourceARN": "arn:aws:lambda:*:*:function:sam-*"
                }
            }
        }
    ]
}
```

In the above policy JSON, `*:*` in the `iam:AssociatedResourceARN` should be replaced with your region and account ID, such as `"arn:aws:lambda:us-east-2:1234567890123:function:sam-*"`. It will work as is, but it is best practice to always scope down permissions as much as possible. You can also replace the `*` in `Resource` with your account ID. `"arn:aws:iam::1234567890123:role/sam-*"` (region isn't necessary).

Also create a new policy on the account for for CloudFormation:

```JSON
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "cloudformation:*",
            "Resource": "*"
        }
    ]
}
```

These are still pretty wide permissions, and are best reserved for sandbox and development, not production environments.

For this example we will be using names such as `sam-8ball-*` so you could restrict resources based on that or whatever other naming convention you'll be using for the example. Typically you'll want to segregate dev units by naming conventions in the arn anyway.

```TEXT
"Resource": "*/sam-8ball-*"
```

## Tutorial

The book _Running Serverless_ by Gojko Adzic will walk you through creating a CloudFormation template, a Node.js script that accesses an S3 bucket, and automated tests, so I highly recommend getting a copy.

The commands below will give you a quick hands-on approach, but the actions behind the commands are explained better in the book.

One key to understanding SAM and eventually maybe even CodeStar is to occasionally look under the hood and gain an understanding of what is beneath as you progress. A lot is automactially done for you as you start out, but as you see and begin to understand the magic, and begin to craft your own code and yaml, you can wield even greater power offered by the platform.

But, before we start tinkering under the hood, let's take it for a test drive!

## Build and Deploy

In November 2019 AWS simplified the Build and Deploy commands and process. You no longer need to establish an S3 bucket for builds, nor do you have to worry about the `sam package` command. Also, the commands were simplified. [Read more about how the process was simplified](https://aws.amazon.com/blogs/compute/a-simpler-deployment-experience-with-aws-sam-cli/), or just move on. I only mention it in case you come across documentation that talks about the package command and a separate S3 bucket.

### Build

Building your application is the first step.

On the command line:

`sam build`

Learn more: <https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html>

### Deploy

Now you will need to come up with a name for your stack. If you are using your own account, for the purposes of this tutorial I would recommend `sam-8ball-1`. If you are using an account shared with others I would suggest adding your name to the stack name. `sam-8ball-<yourname>-1`. We will later deploy a `-test` and a `-prod` and, if you need to, you may always increment the number on the end. You can deploy the same app any number of times!

Let's deploy our app. For the first deploy we will add `--guided` to the command (to set up our parameters).

`sam deploy --guided`

You will then be asked to answer the following questions. The default response is in the brackets []. Supply your own Stack Name, Region, and MyVar value. Hit Enter for the SAM config file and environment.

```TEXT
Stack Name [sam-app]: sam-8ball-1
AWS Region [us-east-1]: us-east-1
Parameter MyVar [42]: 7G
Parameter FavoriteColor [black]: blue
#Shows you resources changes to be deployed and require a 'Y' to initiate deploy
Confirm changes before deploy [y/N]: N
#SAM needs permission to be able to create roles to connect to the resources in your template
Allow SAM CLI IAM role creation [Y/n]: Y
#Preserves the state of previously provisioned resources when an operation fails
Disable rollback [y/N]: N
EightBallFunction may not have authorization defined, Is this okay? [y/N]: y
Save arguments to configuration file [Y/n]: Y
SAM configuration file [samconfig.toml]:
SAM configuration environment [default]:
```

It will now save your settings in a _samconfig.toml_ file so you don't need to mess with long commands such as `sam deploy --template-file output.yaml --stack-name sam-8ball-1 --capabilities CAPABILITY_IAM`.

From now on you can just do `sam deploy`

Your stack should be in the deploy process now. If there are any errors you will need to correct them and then deploy again. `sam deploy`

You will see a message that says `EightBallFunction may not have authorization defined.` That is okay. All it means is that you are creating a public api with no authorization requirements. When you are ready to experiement with defining authorization requirements in your template file check out <https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-controlling-access-to-apis.html>

Learn more about sam deploy: <https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html>

## Call Your Endpoint

API Endpoints are in the form of `https://<apiID>.execute-api.<region>.amazonaws.com/Prod/` (There is a way of getting rid of the `/Prod/` at the end but we're not going to get into that so you'll just have to deal with that for now.)

In the terminal, enter the following where `sam-8ball-1` is the name of your stack.

`aws apigateway get-rest-apis --query "items[?name == 'sam-8ball-1'].id"`

Now, think of a Yes/No question.

Then, take that ID (and your region) and go to: `https://<apiID>.execute-api.<region>.amazonaws.com/Prod/`

You should receive a mystical JSON response!

## Make a change to your template

While it was fun having to learn another command (but one you'll probably never use again), let's change the template to output the URL that was generated.

Because the Lambda function uses an API event, CloudFormation automatically created a basic API Gateway resource for you.

This is fine, but as you create advanced applications you may want to define your own API Gateway with advanced authorization (such as API keys) or even routing endpoint paths to different Lambda functions.

In `template.yml` you'll notice several lines commented out under `Resources` and `Outputs`. Uncomment them (except for the real comments) and re-build and re-deploy your application.

```YAML
Resources:
  WebApi:
    Type: AWS::Serverless::Api
    Properties: 
      StageName: "Prod"
  EightBallFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: app/
      Handler: index.get
      Runtime: nodejs16.x
      Environment:
          Variables:
            MyVar: !Ref MyVar
            FavoriteColor: !Ref FavoriteColor
      Events:
        GetEvent:
          Type: Api
          Properties:
            Path: /
            Method: get
            RestApiId: !Ref WebApi
Outputs:
  UserAPI:
    Description: "API Gateway URL"
    Value: !Sub "https://${WebApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
```

`sam build`

`sam deploy`

During the CloudFormation stack changeset display you'll notice the old ServerlessRestAPI will be deleted and replaced with the new one.

After the deploy you'll also notice a new output section after CloudFormation completes, called _Outputs_. It was created by the `Outputs` section in your template. This lists the _new_ domain to access your app. This domain will not change unless you delete the API resource from your template, or give it a new logical name.

It is important to note that CloudFormation does not delete already created resources from your template. It just updates them if there are any changes. If you were to add an authorization section to your API it would just update the resource and your URI would not change.

From the `Outputs` in the terminal, copy the new URL and go there in your browser. From here on out, unless you delete the resource (or rename it) in your template, this shouldn't change between deploys for _THIS_ stack.

## Add Another Stack

So you have a Stack named _sam-8ball-1_ (or something similar). How does this work if you want to deploy multiple copies of an application? If these were microsites with different database connections? Or, if you wanted to maintain separate test and production stacks?

Earlier you set a default stack name during the guided deploy. But you can override that name by adding `--stack-name <newstackname>` to the deploy command.

`sam deploy --stack-name sam-8ball-test`

`sam deploy --stack-name sam-8ball-prod`

You will now have 3 stacks. `-1`, `-test`, and `-prod`.

So, for example, you could now deploy changes to a test stack, and when you are ready to go live with your changes you can deploy them to production, thereby maintaining a separate test and a production stack from the same source.

## Edit the samconfig.toml file

### Change default stack

Let's set up a test/prod environment where `sam deploy` will by default submit your changes to your test stack, and `sam deploy --stack-name sam-8ball-prod` will deploy to the production stack.

Edit _samconfig.toml_ and change the stack_name to `sam-8ball-test` (or `sam-8ball-yourname-test`)

`stack_name = "sam-8ball-test"`

This will set the default deploy stack to test, which is a safe thing to do as you'd rather accidently deploy changes to test than production.

Do a `sam deploy` and you'll notice it goes to _sam-8ball-test_.

Now, do a `sam deploy --stack-name sam-8ball-prod`

You'll see it will update any changes to the production stack.

You now have a test and production stack!

Notice that both the test and production stacks now how their own unique API URLs.

### Add tags to ALL your resources

Now that you have multiple stacks, and you're sure to create more applications, you'll want to keep track of them all using tags. Though CloudFormation will clean up any deleted resources it is helpful to tag your resources so that others know more about them.

The good news is, that instead of tracking down all the resources CloudFormation creates for you, you can set the tags in the _samconfig.toml_ file and it will replicate those tags among _ALL_ the resources for that stack! Yay! No more forgetting/neglecting organization required tags such as contact info and cost center!

Let's start with just a few. You can add more later. In your _samconfig.toml_ file add this line to the end (Be sure to change the Creator to your name):

```TEXT
tags = "CostCenter=\"0000\" Creator=\"YOU\" Department=\"Hello World\" Purpose=\"8 Ball is fun - This is an example script\""
```

Now,

`sam deploy`

Let's go ahead and update your production stack as well before we forget,

`sam deploy --stack-name sam-8ball-prod`

### Override parameters

You can always override any default parameter in the _samconfig.toml_ file by adding the parameter to the `deploy` command!

For example, we have a parameter we pass to our template called `MyVar` which by default is set to `42` and another called `FavoriteColor` which by default is `black`. However, during the guided deploy I set it to `7G` and `blue` respectively. Suppose for a particular deploy I wanted to override it.

`sam deploy --parameter-overrides FavoriteColor="yellow"`

This would deploy the change to test (because I didn't specify a stack name). If I wanted to send it to production:

`sam deploy --stack-name sam-8ball-prod --parameter-overrides FavoriteColor="yellow"`

On a not-so-side note, you can see juggling different parameters for different deploy stacks can become a little difficult once you move beyond this simple example. And, what if you accidently mis-type a production stack name? You'd either create a new stack or overwrite a different one!

However, you could create a copy of _samconfig.toml_ called _samconfig-prod.toml_, and change the values within the file.

Deploying to test would be the same `sam deploy` which would use the _samconfig.toml_ file. But then, when you want to deploy to production, just do:

`sam deploy --config-file samconfig-prod.toml`

As you get started, this is easy to work with, but as you build more complex applications you'll want to look into pipelines, buildspecs, and conditionals in your templates.

### Manage your own S3 deploy bucket (if you want)

You'll also notice that when deploying it will say:

```TEXT
Managed S3 bucket: aws-sam-cli-managed-default-samclisourcebucket-jasfksfe2sd
A different default S3 bucket can be set in samconfig.toml
```

This bucket has nothing to do with anything you'll be using in your application. This is just temporary storage for builds and deploys. When you did your first deploy AWS created this bucket for you as it was necessary for the deploy process. You never need to interact with it and you shouldn't use it to store other types of data. This is just for AWS to use and it will use it by default for all of your SAM projects.

If you prefer to have AWS manage your temporary builds in another bucket where access is "Bucket and objects not public" and set a retention policy, you may do so and then add the following to _samconfig.toml_:

```TEXT
s3_bucket = "my-source-bucket"
s3_prefix = "my-s3-prefix"
```

Where s3_bucket is the name of the bucket you wish to store builds, and the s3_prefix is the name of your app.

### More info about the samconfig file

More info: <https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html>

## Web Console Tour

We'll delete `sam-8ball-1` and take a tour of what you can see via the web console.

[Sign into the AWS Console](https://aws.amazon.com)

### CloudFormation

Go to the CloudFormation service and click on Stacks. You should see the three stacks you created.

Click on radio button next to the _sam-8ball-1_ stack and then choose Delete.

It will then show that a delete is in progress.

Go back to your terminal window and `sam deploy --parameter-overrides MyVar="22"`

Go back to the Stacks listing web page. You'll see that an update is in progress for _sam-8ball-test_ (you may need to hit refresh).

While these processes complete, let's go into _sam-8ball-prod_ by clicking on it's name.

You'll notice the Stack Info page. If you scroll down to the tags section you'll see that the tags we added to _samconfig.toml_ are listed!

Click through the following tabs: Events, Resources, Outputs, Parameters, Template. Some of this should look familiar and be self-evident.

### Lambda

Still in CloudFormation, go back to the Resources tab. Here you will see all the resources we defined in the _template.yml_ file as well as any CloudFormation created to support our application.

Click on the Physical ID for EightBallFunction. This will take you to the Lambda function. You'll see the function's code listed here. If you were to make any changes and deploy the function from here, they would be overritten on the next deploy from the CLI.

If you scroll down you'll see Environment variables which is set to the parameters we passed to our template and in turn our template assigned to the Lambda environment. If we change the value on this page, just like with the code, it will be overwritten on the next deploy.

If you go into the Configuration tab and into the Tags section you'll see 4 tags that are automatically created by CloudFormation as well as the ones we assigned.

Go ahead and return to the web page you have open for your 8Ball (test) API and ask a few questions while hitting refresh because we're going to check the logs next. (If you closed it, you can go to the CloudFormation stack and find it under Outputs.)

### CloudWatch Logs

Cloudwatch logs were also created for you automatically with your Lambda function. To view your logs go to CloudWatch and click on Log Groups. You can do a search for `/aws/lambda/sam-8ball-test-EightBallFunction` to view the logs. (There won't be anything, not even a Cold Start notification if you haven't run your function yet. Remember, Lambda functions are only "running" when triggered! It's serverless! No trigger, no boot, no run!).

Ask your 8Ball API a few more questions to add to the logs.

At the top of the log stream you should see a COLD START notification. This runs when your Lambda function executes for the first time after deploy or idle timeout (30-45min).

You'll notice that if you hit refresh for a prediction (after a few seconds) you'll get a new log entry and you won't have a cold start. That's because Lambda is already loaded and remains ready while in idle. This idle state can last between 30 and 45 minutes. Come back in an hour and hit refresh and you should see a Cold Start. If your function is triggered regularly within that window you'll see fewer cold starts.

Oh, and of course you'll notice a log of predictions. You can format log outputs so they can be easily parsed by CloudWatch dashboards. But that is beyond the scope of this simple app.

Oh, and you can view real-time logs from the AWS-CLI without having to go into CloudWatch:

`sam logs -n EightBallFunction --stack-name sam-8ball-test`

By default this will be 10 minutes worth of logs. You can specify start and end times as well. You'll have to Google how to do that later othwerwise you'll never get through this README.

You can also get continuous logs:

`sam logs -n EightBallFunction --stack-name sam-8ball-test --tail`

(It will, however, go back to the regular command prompt after a few minutes)

Now hit refresh on your browser and watch the log update! (after a few second delay)

Note how the logs give some additional diagnostics such as duration and memory used. Compare duration of log entries for Cold Starts vs non-cold starts. We're talking milliseconds in this example, barely noticable. It depends on how much housekeeping you have to do during cold start initialization (load external files, get parameters from parameter store, etc).

## Test Your App Locally

Make sure Docker Desktop is running, then:

`sam local start-api`

You should see the application mount.

Then build your application.

`sam build`

Now go to the URL that was listed in the terminal upon the application start.

For example: <http://127.0.0.1:3000/>

You'll notice that you'll always receive a COLD START when running locally.

Let's make a change to _app/index.js_ by adding a certainty value (between 0 and 1) to our prediction.

Change:

```JavaScript
var data = {
    prediction: prediction
};
```

To:

```JavaScript
var data = {
    prediction: prediction,
    certainty: Math.random()
};
```

Now do a `sam build` (you'll need to open a new terminal separate from the one the local server is running in).

Wait for the build to complete and then refresh your browser page to see the prediction (but now with a certainty factor!)

Now ask "Should I deploy to test?" and hit refresh.

Hit refresh until you get a positive answer with a certainty level you can personally accept.

`sam deploy`

Test it out using the API url for _sam-8ball-test_

When you are happy, and the 8Ball tells you to, go ahead and deploy to prod. `sam deploy --config-file samconfig-prod.toml`

No need to ask your app if you mastered SAM builds and deploys, you have! _ta-da!_ _confetti_

## Next Steps and Final Notes

### Read the book

[_Running Serverless_ by Gojko Adzio on Amazon](https://www.amazon.com/Running-Serverless-Introduction-Lambda-Application)

### Resource names

In CloudFormation you probably noticed that the resources are given names based on the stack and function name and a random string of characters.

In our template example, resources are not given names in _template.yml_, we have allowed CloudFormation to generate random resource names. This is a recommended practice and you should be able to distinguish between any organization units by proper stack naming conventions.

One of the reasons it is bad practice to give your resource a name in a template is that you can't deploy the same template twice as there would be name conflicts. In the `sam-8ball-test` and `sam-8ball-prod` example, if we were to have given our resources names in the template the `sam-8ball-prod` deployment would have failed because there would be a naming conflict.

One way to get past that is to pass a parameter for `Stage` and `ProjectID` and incorporate that into your resource names. This is what CodeStar does and you can use any organizational naming conventions in the Project ID.

For now though, we'll let CloudFormation name them. Just know that as you develop real applications and if you have a need to change resource names, you can.

### Repository

You can commit your code to a repository. Just have a `.gitignore` file with the following:

```TEXT
.*
!/.gitignore
output.yaml
```

Temporary build and package files are placed in an _.aws-sam_ folder so you don't need that in your repo, and you don't need _output.yaml_ either. It is up to you as to whether you want _samconfig*.toml_ included in the repo.

After you commit your changes and are ready for a deploy you'll need to still do a build and deploy from the command line.

### Stop here and don't go any further until you have studied SAM for a while

Complete a few more tutorials. Read a few books. Develop in SAM.

Eventually, you'll be able to move on to next steps.

You'll know when you are starting to push the limits of managing your projects. If you need a sage, just ask the 8 Ball. When it says it is time to learn more, move on to--

#### Pipeline and AWS CodeStar

If you are familiar with Code Pipeline you've probably noticed that you are manually performing the Build and Deploy steps.

If you are not familiar with Code Pipeline, well, you probably noticed that you are manually performing the Build and Deploy steps.

If this remains managable for you, great. If you are having a hard time managing test vs prod parameters then you might need to expand into AWS Code Pipeline and AWS CodeStar to manage your team and projects.

Typically, when creating a development pipeline, there is a branch in your Code Repository that you commit finished code to. Suppose you develop and test locally from the _dev_ branch. When you are ready for the next stage, you can merge your changes into the next logical branch such as _test_ or _production_.

If you create a CodePipeline then when you merge and push your changes to your _test_ or _production_ branch Code Pipeline monitors these branches for changes and when new changes are commited, kicks off a build and deploy process.

This is where I make a plug for AWS CodeStar. However, learning CodeStar and then CodeStar CLI is another progression in understanding SAM. Once you have a lot of concepts of SAM figured out, you may want to start looking into seeing if CodeStar is right for you. I really recommend getting the concepts of SAM down first.

If you are fine setting up your repo, building, packaging, and deploying manually from the CLI, then that's okay. But if you need more automation then look into CodeStar.

CodeStar will build you a repository, a pipeline, and a project dashboard. It will also allow you to add team members and connect to issue trackers like JIRA.

As a bonus, you still get AWS-SAM-CLI functions such as `sam logs -n EightBallFunction --stack-name sam-8ball-prod --tail` in CodeStar because it is all CloudFormation Stack and SAM based.

Also, CodeStar uses a standard naming convention for all resources which makes it easier to set up permissions boundaries between groups within an organization. (For example, if you name all your projects with a `dept-projectname` ID where `dept` is your department/unit, then you can set up IAM policies that allow developers in that department/unit to have access to only resources with the `dept-` prefix. (`awscodestar-dept-*` to be exact.)). Note that CodeStar project IDs are limited to 15 characters, so after you add a 3 to 4 letter department code and a dash, we're basically back to 8 character filename days of DOS.

First, in the CodeStar online console, use one of the templates to start a test project. I doubt any real production projects will come out of this so think of it as a sandbox to just play around in. Note that templates with things like Elastic Beanstalk and EC2 will cost money. Be sure to delete those projects when done.

After you have built a few projects using the web console, start checking out tutorials on using CodeStar from the AWS-CLI. That is where the fun comes in! Once you learn more about CodeStar templates (which are templates that create your development environment wrapped around your application template and code) you can create project templates that lock down IAM policies and expand your project to have multiple pipelines (such as test and production).
