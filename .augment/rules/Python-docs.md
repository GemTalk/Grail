---
type: "agent_requested"
description: "The Python Standard Library"
---

Use https://docs.python.org/3/library/index.html to determine what Grail should do to be compatible with CPython.
The file `install.sh` defines various globals, including `True`, `False`, and `None`.
While Smalltalk methods are in separate files with the class name, the class schema is defined in `Python.gs`. Do not do subclass creation in any other file.
When writing code, keep in mind the message precedence: unary, binary, and keyword messages. Please avoid unnecessary parentheses, but take care to avoid stringing together keyword messages without parenthesis.
While writing the primary code is important, writing tests is equally important.
GemStone Smalltalk code can be found in the `image` directory.
