# Python and GemStone

This document looks at some alternatives for making GemStone's features available to Python.

## GCI Wrapper with Two Object Spaces

The traditional approach to making a database available in a programming environment is to provide a library for the language that wraps a C library that connects to the database. For GemStone, the GemStone C Interface (GCI) library (a `.so` in Linux, a `.dylib` in macOS, and a `.dll` in Windows) is wrapped by the GemBuilder for Smalltalk (GBS) and the GemBuilder for Java (GBJ). Open source proof-of-concept libraries have been created for C#, JavaScript, Python, and  Ruby (see [GitHub](https://github.com/jgfoster?tab=repositories&q=gci)). 

### "Transparent Replication"

The original GemStone pitch was for "transparent replication" in which objects magically were brought from the server to the client and modifications were pushed to the server. While this approach made for good demos, it was impractical for anything beyond a trivial application. The overhead of marshalling/unmarshalling and the network latency meant that the developer needed to think carefully about which side of the network would perform which tasks. Eventually a variety of patterns developed to streamline this process. One of these is Remote Service Replication.

### Remote Service Replication (RSR)

Remote Service Replication (RSR) is based on the GCI wrapper with two object spaces, but unlike transparent replication it has an opinionated approach to how tasks are divided between the client and server. It synchronizing object states rather than just sending raw messages. 

#### How the RSR Pattern Works
RSR operates on the principle of Proxies and Services. Instead of manually serializing data, RSR allows you to define services that exist on both the client and server. 

1. Service Definition: You define a "Service" class that exists in both environments.
1. Asynchronous Messaging: When the client sends a message to a local "Proxy" of a server-side object, RSR handles the underlying networking to execute that message on the GemStone server.
1. State Replication: Unlike standard REST APIs where you get a static snapshot of data, RSR can keep the client-side proxy "in sync" with the server-side object. If the server-side object changes, those changes can be replicated back to the client efficiently.
1. Concurrency: RSR is built to be non-blocking. It uses asynchronous promises/futures, allowing a Smalltalk UI (like a web server or desktop app) to remain responsive while waiting for the GemStone database to process heavy transactions. 

#### Key Benefits

* Reduced Boilerplate: You don't have to write custom "glue code" or JSON mappers for every API endpoint.
* Smalltalk-to-Smalltalk: It leverages the fact that both ends speak Smalltalk, allowing for seamless object transmission.
* Performance: It is optimized for the low-latency, high-throughput needs of GemStone applications, often outperforming generic HTTP-based architectures. 

#### RSR vs. GBS (GemBuilder for Smalltalk)

* GBS: The "classic" way to connect. It creates a deep, transparent link where server objects feel like local objects. It is very powerful but can be complex to manage in high-latency or web-scale environments.
* RSR: A "lighter," more explicit pattern. It gives the developer more control over when and what data travels over the wire, making it better suited for modern distributed architectures and cloud deployments. 

#### Challenges

* RSR still maintains the two object space model which requires the developer to create an architecture where some of the behavior is in the client and some is in the server. 
* Server code must be written in Smalltalk even if the client is another language.

## Modification of a Language VM

One possible approach to providing transparent persistence and scaling in a non-Smalltalk language is to modify that language's virtual machine to use the GemStone object manager. 

### Benefits

With this approach we don't need to provide full language compatability and deal with chasing new features with every new release.

### Challenges

We still need to fit our object manager into the existing VM and architecture differences are likely to make this quite challenging. For example, CPython uses reference-counting as its primary approach to garbage collection, GemStone does not support reference-counting at all.

The GemStone team has some experience with this approach: GemStone/J licensed the Java VM and replaced the object manager with the GemStone back-end. While this worked, the engineering team believes this approach is too complex.

## Compiling to GemStone Bytecodes

Just as the existing GemStone/S system compiles Smalltalk sourcecode to bytecodes, one can create a compiler that converts a language (such as Python) to an intermediate/internal representation (IR) that can be compiled to bytecodes by the VM. 

While not a commercial success, we implemented this approach once before with Ruby and found it a satisfactory approach technically.

### Benefits

With this approach the language is implemented completely in GemStone and the existing VM handles all program execution. Transparent replication and scaling is just part of the VM.

### Challenges

With this approach we need to provide full language compatability and deal with any updates required for each new release.

## Conclusion

We are following the "Compiling to GemStone Bytecodes" approach and have not yet found any significant roadblocks.
