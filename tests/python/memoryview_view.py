"""``memoryview'' is a VIEW over another object's bytes.

Driven by PythonTests>>MemoryViewTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

It used to be an IDENTITY STUB: ``builtins>>memoryview:'' answered its argument
unchanged, and the Python name was bound to an empty marker class so that
``isinstance(v, (bytes, memoryview, str))'' guards resolved.  The stub's own
comment said "revisit when something actually trips this", and something did --
wave.py does ``memoryview(data).cast('B')'' for any non-bytes buffer, so
``writeframes(array.array('h', frames))'' raised
``'_array' object has no attribute 'cast'``.

That message names the wrong thing, which is the part worth remembering.
NEITHER CPython's array NOR its bytes has ``cast'' -- ``hasattr(array('h'),
'cast')'' is False there.  memoryview has it.  Because the stub made every
``memoryview(x)'' answer x, the missing method appeared on whatever the caller
happened to pass, and the type that should have carried it was invisible.

A VIEW, NOT A COPY.  The source object is held and its bytes are re-derived on
every content read, so a write through the source is visible through the view and
a write through the view reaches the source.  A copying implementation would have
been much simpler, would have passed the tests that prompted this, and would have
quietly lied about the one property the type exists to provide -- so the
read-through and write-through checks below are the load-bearing ones.

What is deliberately NOT modelled, stated here rather than discovered later:

  * ONE DIMENSION.  ndim is always 1; CPython's multi-dimensional views are not
    modelled.
  * INTEGER FORMATS only (B b H h I i L l Q q), native little-endian.  'f'/'d'
    raise ValueError from cast rather than answering wrong numbers.
  * NO BUFFER EXPORT COUNT.  CPython refuses ``bytearray.resize()'' while a view
    is alive; Grail's view keeps no count on its source, so it cannot.  The two
    test_bytes skips that need export counting therefore stay -- see
    BytearrayTestCase>>testMemoryviewIsARealView.
  * Item assignment is BYTE FORMATS only; a wider format raises rather than
    writing the low byte.

Run this file under CPython (``python3 tests/python/memoryview_view.py'') to see
what it produces -- that is where the expectations come from.
"""

import array


def it_is_not_the_identity_stub():
    """The check the whole change turns on."""
    b = b'abcd'
    return memoryview(b) is not b


def it_is_a_memoryview():
    return isinstance(memoryview(b'abcd'), memoryview)


def a_bytes_view_reports_byte_metadata():
    mv = memoryview(b'\x01\x02\x03\x04')
    return (mv.format == 'B' and mv.itemsize == 1
            and mv.nbytes == 4 and mv.ndim == 1 and mv.shape == (4,))


def a_view_of_bytes_is_readonly():
    return memoryview(b'abcd').readonly is True


def a_view_of_a_bytearray_is_writable():
    """Reported truthfully: code branches on ``.readonly'', so a flag that always
    said True would misdescribe exactly the views that can be written."""
    return memoryview(bytearray(b'abcd')).readonly is False


def indexing_answers_an_item_value():
    """``memoryview(b'abc')[0]'' is 97, not b'a' -- unlike indexing bytes."""
    mv = memoryview(b'\x01\x02\x03\x04')
    return mv[0] == 1 and mv[-1] == 4


def out_of_range_is_an_indexerror():
    try:
        memoryview(b'abcd')[99]
    except IndexError:
        return True
    except Exception as e:
        return 'raised %s, wanted IndexError' % type(e).__name__
    return 'no error'


def len_counts_items_not_bytes():
    """After a cast the length is in ITEMS, which is the whole point of format."""
    return len(memoryview(b'\x01\x02\x03\x04')) == 4 and \
        len(memoryview(b'\x01\x02\x03\x04').cast('h')) == 2


def cast_reinterprets_the_same_bytes():
    """Little-endian: 0x0201 = 513, 0x0403 = 1027."""
    mv = memoryview(b'\x01\x02\x03\x04').cast('h')
    return mv.itemsize == 2 and mv.tolist() == [513, 1027]


def cast_to_an_unsupported_format_raises():
    try:
        memoryview(b'abcd').cast('Z')
    except ValueError:
        return True
    except Exception as e:
        return 'raised %s, wanted ValueError' % type(e).__name__
    return 'no error'


def an_array_can_be_cast_to_bytes():
    """The call wave.py makes, and the reason this type exists."""
    a = array.array('h', b'\x01\x02\x03\x04')
    return memoryview(a).cast('B').tobytes() == b'\x01\x02\x03\x04'


def tobytes_answers_immutable_bytes():
    """Even from a MUTABLE source.  Grail's bytes is ByteArray and its bytearray
    is a subclass of it, so copying the source preserved the subclass and
    ``bytes(memoryview(bytearray(b'hi')))'' came back a bytearray."""
    got = bytes(memoryview(bytearray(b'hi')))
    return got == b'hi' and type(got) is bytes


def tolist_answers_the_items():
    return memoryview(b'\x01\x02').tolist() == [1, 2]


def a_view_reads_through_to_its_source():
    """THE load-bearing check: mutate the source, see it through the view.

    A copying implementation passes every check above and fails this one."""
    ba = bytearray(b'abcd')
    mv = memoryview(ba)
    ba[0] = 122
    return mv.tobytes() == b'zbcd'


def a_view_writes_through_to_its_source():
    """And the other direction."""
    ba = bytearray(b'abcd')
    mv = memoryview(ba)
    mv[0] = 122
    return bytes(ba) == b'zbcd'


def a_readonly_view_refuses_assignment():
    mv = memoryview(b'abcd')
    try:
        mv[0] = 122
    except TypeError:
        return True
    except Exception as e:
        return 'raised %s, wanted TypeError' % type(e).__name__
    return 'no error'


def it_compares_equal_to_its_bytes():
    return memoryview(b'abcd') == b'abcd'


def release_forbids_further_use():
    mv = memoryview(b'abcd')
    mv.release()
    try:
        mv.tobytes()
    except ValueError:
        return True
    except Exception as e:
        return 'raised %s, wanted ValueError' % type(e).__name__
    return 'no error'


def it_works_as_a_context_manager():
    with memoryview(b'abcd') as mv:
        return mv.tobytes() == b'abcd'


def iterating_yields_items():
    return list(memoryview(b'\x01\x02\x03')) == [1, 2, 3]


def a_slice_is_a_sub_view():
    """``mv[1:3]'' answers another memoryview onto the SAME source, not a copy.

    The first implementation had no offset/length and raised ``invalid slice
    key''.  test_int, test_float and test_hash all slice a buffer to get an
    unaligned one, so this is not a corner case."""
    mv = memoryview(b'123')
    sub = mv[1:3]
    return isinstance(sub, memoryview) and sub.tobytes() == b'23'


def a_slice_writes_through_to_the_original_source():
    """A sliced view is still a view: writing into it reaches the original
    object at the right offset."""
    ba = bytearray(b'abcd')
    sub = memoryview(ba)[1:3]
    sub[0] = 122
    return bytes(ba) == b'azcd'


def a_negative_slice_bound_counts_from_the_end():
    return memoryview(b'abcd')[-2:].tobytes() == b'cd'


def an_out_of_range_slice_clamps():
    """Python slice bounds clamp rather than raising."""
    return memoryview(b'abcd')[2:99].tobytes() == b'cd'


def int_accepts_a_sliced_view():
    """The exact call test_int makes."""
    return int(memoryview(b'123')[1:3]) == 23


def a_readonly_view_hashes_like_its_bytes():
    """CPython hashes a readonly view by content, so an aligned and an unaligned
    view of the same bytes hash equal -- which is what test_hash checks."""
    b = b'123456789abcdef'
    return hash(memoryview(b)[2:8]) == hash(b[2:8])


def a_writable_view_refuses_to_hash():
    """Hashing something that can change under you is the bug the refusal
    exists to prevent."""
    try:
        hash(memoryview(bytearray(b'abcd')))
    except ValueError:
        return True
    except Exception as e:
        return 'raised %s, wanted ValueError' % type(e).__name__
    return 'no error'


def it_has_hex():
    return memoryview(b'\x01\xff').hex() == '01ff'


def bytes_methods_accept_a_view():
    """A view is a BUFFER, so bytes methods that take one must accept it.

    These passed before memoryview was real -- because ``memoryview(x)'' WAS x
    -- and broke when it became a type, which is how it came out that join and
    strip had no buffer path at all."""
    return (b'-'.join([memoryview(b'a'), memoryview(b'b')]) == b'a-b'
            and b'xax'.strip(memoryview(b'x')) == b'a'
            and b'a:b'.split(memoryview(b':')) == [b'a', b'b'])


def re_accepts_a_view():
    """``_sre'' is the C shim and acquires its subject through
    PyObject_GetBuffer, which cannot see a Grail view, so re flattens a
    memoryview subject before it crosses."""
    import re
    return (re.findall(b':+', memoryview(b'a:b::c')) == [b':', b'::']
            and re.sub(b'b', memoryview(b'a'), b'xbz') == b'xaz')


def repr_survives_a_released_view():
    """repr runs while an error message about a memoryview is being formatted,
    so it has to work before anything else does -- and CPython prints a released
    view rather than raising."""
    mv = memoryview(b'abcd')
    mv.release()
    return repr(mv).startswith('<released memory at 0x')


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        it_is_not_the_identity_stub,
        it_is_a_memoryview,
        a_bytes_view_reports_byte_metadata,
        a_view_of_bytes_is_readonly,
        a_view_of_a_bytearray_is_writable,
        indexing_answers_an_item_value,
        out_of_range_is_an_indexerror,
        len_counts_items_not_bytes,
        cast_reinterprets_the_same_bytes,
        cast_to_an_unsupported_format_raises,
        an_array_can_be_cast_to_bytes,
        tobytes_answers_immutable_bytes,
        tolist_answers_the_items,
        a_view_reads_through_to_its_source,
        a_view_writes_through_to_its_source,
        a_readonly_view_refuses_assignment,
        it_compares_equal_to_its_bytes,
        release_forbids_further_use,
        it_works_as_a_context_manager,
        iterating_yields_items,
        a_slice_is_a_sub_view,
        a_slice_writes_through_to_the_original_source,
        a_negative_slice_bound_counts_from_the_end,
        an_out_of_range_slice_clamps,
        int_accepts_a_sliced_view,
        a_readonly_view_hashes_like_its_bytes,
        a_writable_view_refuses_to_hash,
        it_has_hex,
        bytes_methods_accept_a_view,
        re_accepts_a_view,
        repr_survives_a_released_view,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
