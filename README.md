# Omnigen - an actually useful specification-based content generator

Goals:
* Be useful rather than strict.
* Care about real-world situations.
* Lots of configuration to suit your needs.
* No string templating and regex horrors.
* Code is complex, so the generator needs to be complex.
* Generate code, not project archetypes.
* Be agile, transform in modularized steps.
* Don't get locked in, bind together different specifications.
* Solve complex cases; error handling and type unions.
* Easily add new languages; Reuse 90%.
* Less hacks, more over-engineering.
* Make your generated code work for you. With you. In actual projects.

## Backstory of problem with *other* generators

There is a reason that very few enterprises use contract-first code, and developers avoid contract-first models.
It is because the real world is messy, and you actually need your generated code to work with you, not against you.

But when you look out there on the Internet for code generators, all you see are hacks that build strings by-hand and who think they
are some kind of archetype project generators instead of a tool to keep developers easily synchronized with the development of other projects' APIs, **without** compromising their code.

Oh, so you want to use `Lombok` for your `Java` models? Easy! Just rewrite every `Mustache` template for the language,
and then watch as your code is basically impossible to print nicely, or to keep track of divergences between your template and the official one.

You want to give support for a certain annotation for your generated properties? Easy! Just write a plugin
that take the generated code, and then through RegEx replace/insert your code where you want it.
Oh? The project changed how they print the strings and now everything is broken? Tough luck.

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
* OpenRpc
* JSONSchema 5, 6, 7
* TypeScript Definitions (coming)
* OpenApi3 (coming)
* OpenApi2 - Swagger (coming)
* AsyncApi (coming)

## Supported Outputs
* Java
* TypeScript
* C#

Many more inputs and outputs are coming. Development is currently focused on the underlying functionality first.
