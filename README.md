# Serverless Application Model 8 Ball Example

This is a sample of the Serverless Application Model that deviates from the traditional "Hello World" as instead it returns JSON formatted magical predictions.

This README will guide you through AWS-SAM-CLI setup, account permissions, and then a quick hands-on introduction to using the SAM CLI to give you an idea of what SAM has to offer and how easy it can be to implement.

It will not get into creating templates, adding data storage, or all the cool things you can do. Instead it will focus on building and deploying stacks from the CLI which is a great introduction that will give you a sense of accomplishment! (As well as a fun, interactive, instructional app that is much better than staring at a static display of "Hello World").

To start building your own SAM applications and to learn the concepts behind what is demonstrated here, I recommend _Running Serverless_ by Gojko Adzic.

> If you need to set up your local development environment and/or AWS account to provide access for SAM actions please review the [Setting Up Environment documentation](./README-Setting-Up-Env.md) or follow your organization's procedure.

## Tutorial

The book _Running Serverless_ by Gojko Adzic will walk you through creating a CloudFormation template, a Node.js script that accesses an S3 bucket, and automated tests, so I highly recommend getting a copy.

The commands below will give you a quick hands-on approach, but the actions behind the commands are explained better in the book.

One key to understanding SAM is to occasionally look under the hood and gain an understanding of what is beneath as you progress. A lot is automatically done for you as you start out, but as you see and begin to understand the magic, and begin to craft your own code and yaml, you can wield even greater power offered by the platform.

But, before we start tinkering under the hood, let's take it for a test drive!

> If your organization requires the use of IAM Role Paths and Permissions Boundaries, you will need to update the Lambda function properties in `template.yml` accordingly.

## Build and Deploy

In November 2019 AWS simplified the Build and Deploy commands and process. You no longer need to establish an S3 bucket for builds, nor do you have to worry about the `sam package` command. Also, the commands were simplified. [Read more about how the process was simplified](https://aws.amazon.com/blogs/compute/a-simpler-deployment-experience-with-aws-sam-cli/), or just move on. I only mention it in case you come across documentation that talks about the package command and a separate S3 bucket.

### Build

Building your application is the first step.

On the command line:

`sam build`

Learn more about [sam build on the CLI Command Reference page](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html)

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

It will now save your settings in a `samconfig.toml` file so you don't need to mess with long commands such as `sam deploy --template-file output.yaml --stack-name sam-8ball-1 --capabilities CAPABILITY_IAM`.

From now on you can just do `sam deploy`

Your stack should be in the deploy process now. If there are any errors you will need to correct them and then deploy again. `sam deploy`

You will see a message that says `EightBallFunction may not have authorization defined.` That is okay. All it means is that you are creating a public api with no authorization requirements. When you are ready to experiment with defining authorization requirements in your template file check out [Controlling Access to APIs](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-controlling-access-to-apis.html).

Learn more about the [sam deploy command](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html)

## Call Your Endpoint

API Endpoints are in the form of `https://{{apiID}}.execute-api.{{region}}.amazonaws.com/Prod/` (There is a way of getting rid of the `/Prod/` at the end but we're not going to get into that so you'll just have to deal with that for now.)

In the terminal, enter the following where `sam-8ball-1` is the name of your stack.

`aws apigateway get-rest-apis --query "items[?name == 'sam-8ball-1'].id"`

Now, think of a Yes/No question.

Then, take that ID (and your region) and go to: `https://{{apiID}}.execute-api.{{region}}.amazonaws.com/Prod/`

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
      Runtime: nodejs20.x
      RolePath: /
      PermissionsBoundary: !Ref 'AWS::NoValue' # don't worry about this unless your organization requires a permissions boundary
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

After the deploy you'll also notice a new output section after CloudFormation completes, called `Outputs`. It was created by the `Outputs` section in your template. This lists the _new_ domain to access your app. This domain will not change unless you delete the API resource from your template, or give it a new logical name.

It is important to note that CloudFormation does not delete already created resources from your template. It just updates them if there are any changes. If you were to add an authorization section to your API it would just update the resource and your URI would not change.

From the `Outputs` in the terminal, copy the new URL and go there in your browser. From here on out, unless you delete the resource (or rename it) in your template, this shouldn't change between deploys for _THIS_ stack.

## Add Another Stack

So you have a Stack named `sam-8ball-1` (or something similar). How does this work if you want to deploy multiple copies of an application? If these were microsites with different database connections? Or, if you wanted to maintain separate test and production stacks?

Earlier you set a default stack name during the guided deploy. But you can override that name by adding `--stack-name <newstackname>` to the deploy command.

`sam deploy --stack-name sam-8ball-test`

`sam deploy --stack-name sam-8ball-prod`

You will now have 3 stacks. `-1`, `-test`, and `-prod`.

So, for example, you could now deploy changes to a test stack, and when you are ready to go live with your changes you can deploy them to production, thereby maintaining a separate test and a production stack from the same source.

## Edit the samconfig.toml file

### Change default stack

Let's set up a test/prod environment where `sam deploy` will by default submit your changes to your test stack, and `sam deploy --stack-name sam-8ball-prod` will deploy to the production stack.

Edit `samconfig.toml` and change the stack_name to `sam-8ball-test` (or `sam-8ball-yourname-test`)

`stack_name = "sam-8ball-test"`

This will set the default deploy stack to test, which is a safe thing to do as you'd rather accidentally deploy changes to test than production.

Do a `sam deploy` and you'll notice it goes to `sam-8ball-test`.

Now, do a `sam deploy --stack-name sam-8ball-prod`

You'll see it will update any changes to the production stack.

You now have a test and production stack!

Notice that both the test and production stacks now how their own unique API URLs.

### Add tags to ALL your resources

Now that you have multiple stacks, and you're sure to create more applications, you'll want to keep track of them all using tags. Though CloudFormation will clean up any deleted resources it is helpful to tag your resources so that others know more about them.

The good news is, that instead of tracking down all the resources CloudFormation creates for you, you can set the tags in the `samconfig.toml` file and it will replicate those tags among _ALL_ the resources for that stack! Yay! No more forgetting/neglecting organization required tags such as contact info and cost center!

Let's start with just a few. You can add more later. In your `samconfig.toml` file add this line to the end (Be sure to change the Creator to your name):

```TEXT
tags = "CostCenter=\"0000\" Creator=\"YOU\" Department=\"Hello World\" Purpose=\"8 Ball is fun - This is an example script\""
```

Now,

`sam deploy`

Let's go ahead and update your production stack as well before we forget,

`sam deploy --stack-name sam-8ball-prod`

### Override parameters

You can always override any default parameter in the `samconfig.toml` file by adding the parameter to the `deploy` command!

For example, we have a parameter we pass to our template called `MyVar` which by default is set to `42` and another called `FavoriteColor` which by default is `black`. However, during the guided deploy I set it to `7G` and `blue` respectively. Suppose for a particular deploy I wanted to override it.

`sam deploy --parameter-overrides FavoriteColor="yellow"`

This would deploy the change to test (because I didn't specify a stack name). If I wanted to send it to production:

`sam deploy --stack-name sam-8ball-prod --parameter-overrides FavoriteColor="yellow"`

On a not-so-side note, you can see juggling different parameters for different deploy stacks can become a little difficult once you move beyond this simple example. And, what if you accidentally mis-type a production stack name? You'd either create a new stack or overwrite a different one!

However, you could create a copy of `samconfig.toml` called `samconfig-prod.toml`, and change the values within the file.

Deploying to test would be the same `sam deploy` which would use the `samconfig.toml` file. But then, when you want to deploy to production, just do:

`sam deploy --config-file samconfig-prod.toml`

As you get started, this is easy to work with, but as you build more complex applications you'll want to look into pipelines, buildspecs, and conditionals in your templates.

### Manage your own S3 deploy bucket (if you want)

You'll also notice that when deploying it will say something like:

```TEXT
Managed S3 bucket: aws-sam-cli-managed-default-samclisourcebucket-jasfksfe2sd
A different default S3 bucket can be set in samconfig.toml
```

This bucket has nothing to do with anything you'll be using in your application. This is just temporary storage for builds and deploys. When you did your first deploy AWS created this bucket for you as it was necessary for the deploy process. You never need to interact with it and you shouldn't use it to store other types of data. This is just for AWS to use and it will use it by default for all of your SAM projects.

If you prefer to have AWS manage your temporary builds in another bucket where access is "Bucket and objects not public" and set a retention policy, you may do so and then add the following to `samconfig.toml`:

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

Click on radio button next to the `sam-8ball-1` stack and then choose Delete.

It will then show that a delete is in progress.

Go back to your terminal window and `sam deploy --parameter-overrides MyVar="22"`

Go back to the Stacks listing web page. You'll see that an update is in progress for `sam-8ball-test` (you may need to hit refresh).

While these processes complete, let's go into `sam-8ball-prod` by clicking on it's name.

You'll notice the Stack Info page. If you scroll down to the tags section you'll see that the tags we added to `samconfig.toml` are listed!

Click through the following tabs: Events, Resources, Outputs, Parameters, Template. Some of this should look familiar and be self-evident.

### Lambda

Still in CloudFormation, go back to the Resources tab. Here you will see all the resources we defined in the `template.yml` file as well as any CloudFormation created to support our application.

Click on the Physical ID for EightBallFunction. This will take you to the Lambda function. You'll see the function's code listed here. If you were to make any changes and deploy the function from here, they would be overridden on the next deploy from the CLI.

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

By default this will be 10 minutes worth of logs. You can specify start and end times as well. You'll have to Google how to do that later otherwise you'll never get through this README.

You can also get continuous logs:

`sam logs -n EightBallFunction --stack-name sam-8ball-test --tail`

(It will, however, go back to the regular command prompt after a few minutes)

Now hit refresh on your browser and watch the log update! (after a few second delay)

Note how the logs give some additional diagnostics such as duration and memory used. Compare duration of log entries for Cold Starts vs non-cold starts. We're talking milliseconds in this example, barely noticeable. It depends on how much housekeeping you have to do during cold start initialization (load external files, get parameters from parameter store, etc).

## Test Your App Locally

Make sure Docker Desktop is running, then:

`sam local start-api`

You should see the application mount.

Then build your application.

`sam build`

Now go to the URL that was listed in the terminal upon the application start.

For example: <http://127.0.0.1:3000/>

You'll notice that you'll always receive a COLD START when running locally.

Let's make a change to `app/index.js` by adding a certainty value (between 0 and 1) to our prediction.

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

Test it out using the API url for `sam-8ball-test`

When you are happy, and the 8Ball tells you to, go ahead and deploy to prod. `sam deploy --config-file samconfig-prod.toml`

No need to ask your app if you mastered SAM builds and deploys, you have! _ta-da!_ _confetti_

## Next Steps and Final Notes

### Read the book

[_Running Serverless_ by Gojko Adzio on Amazon](https://www.amazon.com/Running-Serverless-Introduction-Lambda-Application)

### Resource names

In CloudFormation you probably noticed that the resources are given names based on the stack and function name and a random string of characters.

In our template example, resources are not given names in `template.yml`, we have allowed CloudFormation to generate random resource names. This is a recommended practice and you should be able to distinguish between any organization units by proper stack naming conventions.

One of the reasons it is bad practice to give your resource a name in a template is that you can't deploy the same template twice as there would be name conflicts. In the `sam-8ball-test` and `sam-8ball-prod` example, if we were to have given our resources names in the template the `sam-8ball-prod` deployment would have failed because there would be a naming conflict.

One way to get past that is to pass a parameter for `Stage` and `ProjectID` and incorporate that into your resource names. You can use any organizational naming conventions in the Project ID.

For now though, we'll let CloudFormation name them. Just know that as you develop real applications and if you have a need to change resource names, you can.

### Repository

You can commit your code to a repository. Just have a `.gitignore` file with the following:

```TEXT
.*
!/.gitignore
output.yaml
```

Temporary build and package files are placed in an `.aws-sam` folder so you don't need that in your repo, and you don't need `output.yaml` either. It is up to you as to whether you want `samconfig*.toml` included in the repo.

After you commit your changes and are ready for a deploy you'll need to still do a build and deploy from the command line.

### Stop here and don't go any further until you have studied SAM for a while

Complete a few more tutorials. Read a few books. Develop in SAM.

Eventually, you'll be able to move on to next steps.

You'll know when you are starting to push the limits of managing your projects. If you need a sage, just ask the 8 Ball. When it says it is time to learn more, move on to--

#### AWS CodePipeline

If you are familiar with CodePipeline you've probably noticed that you are manually performing the Build and Deploy steps.

If you are not familiar with CodePipeline, well, you probably noticed that you are manually performing the Build and Deploy steps.

If this remains manageable for you, great. If you are having a hard time managing test vs prod parameters then you might need to expand into AWS Code Pipeline to manage your team and projects.

Typically, when creating a development pipeline, there is a branch in your Code Repository that you commit finished code to. Suppose you develop and test locally from the `dev` branch. When you are ready for the next stage, you can merge your changes into the next logical branch such as `test` or `production`.

If you create a CodePipeline then when you merge and push your changes to your `test` or `production` branch, CodePipeline monitors these branches for changes and when new changes are committed, kicks off a build and deploy process.

If you are fine setting up your repo, building, packaging, and deploying manually from the CLI, then that's okay. But if you need more automation then look into the starter pipeline (Atlantis) I developed along with a tutorial.

The Atlantis pipeline uses a standard naming and tagging convention for all resources which makes it easier to set up permissions and separate teams within an organization. (For example, if you name all your projects with a `dept-projectname` ID where `dept` is your department/unit, then you can set up IAM policies that allow developers in that department/unit to have access to only resources with the `dept-` prefix.)

Ready for more? [Visit my starter Atlantis CodePipeline tutorial on GitHub](https://github.com/chadkluck/serverless-deploy-pipeline-atlantis)
