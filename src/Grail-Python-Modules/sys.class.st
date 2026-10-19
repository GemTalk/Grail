"Python sys module.

This class provides access to some variables used or maintained by the
interpreter and to functions that interact strongly with the interpreter.

Key attributes:
- argv: Command line arguments
- path: Module search path
- modules: Dictionary of loaded modules
- stdin/stdout/stderr: Standard I/O streams
- version/version_info: Python version information
- platform: Platform identifier
- exit(): Exit the interpreter
- exc_info(): Current exception information

See https://docs.python.org/3/library/sys.html for the complete list.

"
Class {
	#name : 'sys',
	#superclass : 'NativeModule',
	#classInstVars : [
		'modules'
	],
	#category : 'Grail-Modules'
}
