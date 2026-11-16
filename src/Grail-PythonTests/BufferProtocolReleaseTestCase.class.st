Class {
	#name : 'BufferProtocolReleaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BufferProtocolReleaseTestCase >> testAnExporterIsAskedForItsBufferAndToldOfItsRelease [
	"tests/python/buffer_protocol_release.py: memoryview(x) asks a Python
	__buffer__ -- a bytearray subclass's too -- and releasing the view hands
	that view to x's __release_buffer__, or a restricted view when only
	__release_buffer__ is x's own or the view is over x itself; bytes and
	bytearray carry the builtin pair.  The hooks are the ones the MRO finds, a
	mixin's left of bytearray included, and a view a ``with'' holds keeps its
	bytearray from being resized.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'buffer_protocol_release' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/buffer_protocol_release.py')
		name: 'buffer_protocol_release'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
BufferProtocolReleaseTestCase >> testAReleasedKeptViewLeavesNoRegistry [
	"A view a Python __release_buffer__ kept is an export only until it is
	released (ByteArray >> ___isHeldByAKeptView___:).  The resize after its
	release forgets it, so no later resize of that bytearray pays a
	mark-sweep for it.

	Asserted for THIS bytearray only: a kept view elsewhere may rightly still
	be registered -- the fixture's first exporter stores its view in a module
	global -- and the registry is dropped only once it is empty."

	| ba kept |
	ba := self eval: 'ba = bytearray(b"hello")
class C:
    def __buffer__(self, flags):
        return memoryview(ba)
    def __release_buffer__(self, buffer):
        self.buffer = buffer
c = C()
with memoryview(c):
    pass
c.buffer.release()
ba.clear()
ba'.
	kept := (SessionTemps current at: #'GrailBufferExports' otherwise: KeyValueDictionary new)
		at: #'___keptViews___' otherwise: #().
	self assert: ba size equals: 0.
	self deny: (kept anySatisfy: [:ref |
		ref value notNil and: [(ref value dynamicInstVarAt: #'_obj') == ba]])

]

{ #category : 'Grail-Tests' }
BufferProtocolReleaseTestCase >> testAWithInAGeneratorBodyHoldsNoExport [
	"A DELIBERATE DIVERGENCE, pinned.  CPython refuses this extend: the
	suspended generator is alive, so its view is, and the bytearray is
	exported.  Grail lets it through, because a ``with'' in a generator body
	registers no export (memoryview >> ___holdExportForWith___).  Such a body
	can be abandoned mid-with -- ``break'' out of a for over it -- and Grail,
	unlike CPython's refcount, only closes it at a later GC, so an export held
	there would refuse resizes CPython allows.  The same view in an ordinary
	frame is refused, as the fixture checks."

	self
		assert: (self eval: 'buf = bytearray(b"abcdef")
def chunks(b):
    with memoryview(b) as view:
        for i in range(0, len(b), 2):
            yield bytes(view[i:i + 2])
g = chunks(buf)
first = next(g)
buf.extend(b"g")
[first, bytes(buf)]') printString
		equals: (self eval: '[b"ab", b"abcdefg"]') printString

]

{ #category : 'Grail-Tests' }
BufferProtocolReleaseTestCase >> testTheLastReleaseDropsTheExportRegistry [
	"Ending the last export removes the registry, so that a bytearray resize
	is back to one nil test (ByteArray >> ___beginBufferExport___): a single
	``with memoryview(b)'' must not leave every later resize in the session
	paying a dictionary lookup.

	Asserted as the invariant -- no EMPTY registry is ever left behind --
	rather than as ``the same as before'': an earlier test that left an empty
	one would otherwise make this pass with the drop missing, which a control
	run showed it doing."

	| after |
	self eval: 'b = bytearray(b"ab")
with memoryview(b):
    pass
b.extend(b"c")'.
	after := SessionTemps current at: #'GrailBufferExports' otherwise: nil.
	self deny: (after notNil and: [after isEmpty])

]
