"Request that a generator exit.

This exception is raised when a generator's close() method is called.
It inherits directly from BaseException instead of Exception since it is
technically not an error.

"
Class {
	#name : 'GeneratorExit',
	#superclass : 'BaseException',
	#category : 'Grail-Exceptions'
}
