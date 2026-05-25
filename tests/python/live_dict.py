# Fixture for LiveDictTestCase.
#
# Python: ``obj.__dict__'' is a LIVE view of the instance's
# attributes — writes via ``__dict__['x'] = v'' or
# ``__dict__.update(other)'' propagate back to the instance.
# Reading ``obj.x'' afterwards sees the new value.
#
# Pre-fix, Grail's ``PythonInstance >> __dict__'' returned a fresh
# snapshot KeyValueDictionary built from dynamicInstVarPairs;
# mutations silently dropped.  The CPython idiom
#   rv = object.__new__(self.__class__)
#   rv.__dict__.update(self.__dict__)
# (used by jinja2's Frame.copy() / Symbols.copy() / nodes.py
# Node.fields snapshot, plus markupsafe, blinker, ...)  left ``rv''
# empty.
#
# Fix: ``__dict__'' returns a PyInstanceDict — a live view that
# proxies reads / writes to the source instance's
# dynamicInstVarAt:put: storage.


class Box:
    def __init__(self, label):
        self.label = label


# --- Live read after instance write ---
b1 = Box('start')
b1.x = 1
b1.y = 2
d1 = b1.__dict__
d1_label = d1['label']
d1_x = d1['x']
d1_x_in = 'x' in d1
d1_missing_in = 'missing' in d1


# --- Live write via __setitem__ propagates back ---
b2 = Box('write-test')
b2.__dict__['injected'] = 42
b2_reads_injected = b2.injected             # 42 if write propagated


# --- update() propagates ---
src = Box('source')
src.a = 10
src.b = 20

dst = Box('destination')
dst.__dict__.update(src.__dict__)
dst_a = dst.a
dst_b = dst.b
dst_label = dst.label                       # 'destination' — not overwritten
dst_label_in_dict = 'label' in dst.__dict__


# --- The exact Frame.copy() idiom ---
def copy_like_frame(src):
    rv = object.__new__(src.__class__)
    rv.__dict__.update(src.__dict__)
    return rv


orig = Box('orig')
orig.flag = True
copied = copy_like_frame(orig)
copied_flag = copied.flag                   # True if dict copy propagated
copied_label = copied.label                 # 'orig'
copied_is_box = isinstance(copied, Box)


# --- keys() / items() yield current state ---
b3 = Box('iter')
b3.x = 'X'
b3.y = 'Y'
b3_keys = sorted(list(b3.__dict__.keys()))
b3_items_count = len(list(b3.__dict__.items()))
