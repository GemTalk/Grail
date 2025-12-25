---
type: "agent_requested"
description: "The Python Standard Library"
---

Grail is a project to host Python in GemStone/S. Our approach is to use `pprintast` to generate a text file with the AST for a Python module (file) and then use Smalltalk to parse that text file and generate Smalltalk objects named `*.Ast` (found in `smalltalk/ast`) that represent that file. Then we walk the Salltalk object (AST nodes) and generate Smalltalk code that performs the same actions as the original Python code. This Smalltalk code is passed to the GemStone VM to be executed.
Use https://docs.python.org/3/library/index.html to determine what Grail should do to be compatible with CPython.
The file `install.sh` defines various globals, including `True`, `False`, and `None`.
While Smalltalk methods are in separate files with the class name, the class schema is defined in `smalltalk/classes/classes.gs`. Do not do subclass creation in any other file. In the same way, when writing code for AST nodes, put the methods in the existing files, but keep the class definitions in `smalltalk/ast/PythonAst.gs`.
When writing code, keep in mind the Smalltalk message precedence: unary, binary, and keyword messages. Please avoid unnecessary parentheses, but take care to avoid stringing together keyword messages without parenthesis.
While writing the primary code is important, writing tests is equally important.
GemStone Smalltalk code can be found in the `gemstone` directory. This defines what GemStone supports. You can also read the existing `smalltalk/classes` and `tests` code to find examples.
In Smalltalk it is necessary to define all temporary variables at the top of the method or block. You can't define variables after code. In Smalltalk every keyword message must receive exactly the right number of arguments, and parentheses are essential to ensure the parser groups the expression correctly.
