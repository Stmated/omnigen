# Omnigen - an actually useful specification-based content generator

## Problems with existing generators:
* Not caring about real-world situations; caring more about spec strictness than **actual usefulness**.
* Not reusing techniques between different output languages.
* Not giving **easy** way of extending a language without going crazy.
* Not generating what you want. Full projects with superfluous shit instead of **what you want**.
* No handling of multiple response types from one endpoint.
* No error handling.
* No easy configuration.
* No cohesion between the configuration of different languages.
* No structured rendering of content, instead using absurd string templating.
* Not outputting content in a way that can be extended by plugins.
* No way of rendering actual pretty code without war with hoards of strings.
* No way of binding together different specifications with each other.

There is a reason that basically no enterprise applications use contract-first code.
It is because the real world is messy, and you actually need your generated code to work with you, not against you.

But when you look out there on the Internet for code generators, all you see are hacks that build strings by-hand and who think they
are some kind of archetype project generators instead of a tool to keep developers easily synchronized with the development of other projects' APIs, **without** compromising their code.

Oh, so you want to use Lombok for your Java models? Easy! Just rewrite every Mustache template for the language,
and then watch as your code is basically impossible to print nicely, or to keep track of what has changed in the new version
of the generator compared to your changes.

You want to give support for a certain annotation for your generated properties? Easy! Just write a plugin
that take the generated code, and then through RegEx replace/insert your code where you want it.
Oh? The project changed how they print the strings and now everything is broken? Tough luck.

## What Omnigen tries to solve:
90% of programming languages are similar, so 90% of code generation logic should be reusable between them.

That is the goal. To build a generator that makes it incredibly easy to pick parts from different languages, and use them for something else/new.

Modular, easy to extend, logic.

No special handling in some Mustache string template renderer that fetches the original JSON-Schema of some property and checks if it has some proprietary extension value set.

Less hack. More structure.

And to make your generated code work for you. With you. In actual projects.

## How it works:
Every code generation goes through these steps:
* Conversion from schema to common model
* Execution of transformers over the common model
* Conversion from common model to Abstract Syntax Tree (AST)
* Execution of transformers over the AST
* Conversion from AST to Concrete Syntax Tree (CST)
* Execution of transformers over the CST
* Conversion of CST to strings by use of renderers
* Outputting of strings to disk or other target

By splitting the work in these many steps, it means we have many different layers of specificity to make our code generation.

It means that we can create re-usable parts of code that we can use for many different languages. Adding support for new languages should hence be quite easy, since most languages share many common factors.

## Supported Inputs
* OpenApi3 (coming)
* OpenApi2 - Swagger (coming)
* AsyncApi (coming)
* OpenRpc
* TypeScript Definitions

## Supported Outputs
* Java
* ... many more coming, this is just starting
