"Python ``socket.herror' -- an OSError subclass raised by the legacy
gethostby* lookups.  Kept separate from gaierror because CPython raises
herror from gethostbyaddr/gethostbyname_ex and gaierror from getaddrinfo,
and code in the wild does discriminate."
Class {
	#name : 'herror',
	#superclass : 'OSError',
	#category : 'Grail-Modules'
}
