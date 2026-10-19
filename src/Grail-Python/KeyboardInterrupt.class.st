"Program interrupted by user.

This exception is raised when the user hits the interrupt key (normally
Control-C or Delete). It inherits from BaseException so that it is not
accidentally caught by code that catches Exception.

"
Class {
	#name : 'KeyboardInterrupt',
	#superclass : 'BaseException',
	#category : 'Grail-Exceptions'
}
