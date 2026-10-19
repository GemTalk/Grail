"Python ``_struct.unpack_iterator'': what iter_unpack answers.

iter_unpack decodes every record up front (see struct >> iter_unpack:_:), so the
iteration itself is a list_iterator's over the decoded tuples, and this class
adds nothing but its NAME.  The name is the point: CPython's type is its own and
cannot be constructed from Python, and answering the list's iterator made
``type(s.iter_unpack(b''))'' the list's type."
Class {
	#name : 'unpack_iterator',
	#superclass : 'list_iterator',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
unpack_iterator class >> new [
	"Refused, which is what makes the type uninstantiable from Python:
	``type(it)()'' reaches object's allocator, and this answers it with
	CPython's own TypeError.  Raised here rather than left to the allocator's
	generic ``cannot create ... instances'', because that one names the bare
	Smalltalk class, and CPython's names the type as its module qualifies it:
	'_struct.unpack_iterator'.  The one legitimate constructor is ___new___
	below, reached through list_iterator class >> ___on:."

	^ TypeError @env1:___signal___: 'cannot create ''_struct.unpack_iterator'' instances'

]
