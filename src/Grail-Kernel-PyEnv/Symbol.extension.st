Extension { #name : 'Symbol' }

{ #category : 'Grail-Hashing & Identity' }
Symbol >> __hash__ [
	"The CONTENT hash, so that Python's ``a == b implies hash(a) == hash(b)''
	holds between a Symbol and the equal str -- see the file comment above.

	``asString'' copies the Symbol into a plain String, whose ``hash'' is the
	Pearson content hash (String >> hash, <primitive: 31>); Symbol's own
	``hash'' override is what has to be stepped around, and a session method
	cannot declare the primitive itself (CompilePrimitives privilege).  Every
	string representation of the same characters hashes alike under Unicode
	comparison mode -- String, Unicode7, Unicode16 and Unicode32 all answer the
	same value -- so this is the str hash for a non-ASCII Symbol too, not only
	for an ASCII one.

	The copy costs one small allocation per hash, and only on the Symbol path:
	str / int / tuple keys never reach this method, so ordinary dict and set
	operations are unchanged."

	^ self @env0:asString @env0:hash

]

{ #category : 'Grail-Conversion' }
Symbol >> __str__ [
	"``str(sym)'' answers a GENUINE str, the way CPython's str() of a str
	subclass answers exactly str.

	CharacterCollection >> __str__ answers ``self'', which for a Symbol handed
	back the Symbol -- so ``str(sym)'', the obvious way to launder one at the
	boundary, laundered nothing: type(str(sym)).__name__ still read 'Symbol'
	and the result was still INVARIANT, so ``str(sym).replace(...)'' still died
	with the uncatchable ``Attempt to modify invariant object''.

	str.__new__ answers a kernel-string argument's __str__ WITHOUT copying (it
	must: copying a wide Unicode16/32 into the narrow canonical class would
	corrupt it), so overriding __str__ here is what makes str(sym) a str."

	^ self @env0:asString @env0:asUnicodeString

]
