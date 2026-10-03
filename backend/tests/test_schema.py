import unittest

from core.schema import SchemaError, validate

SCHEMA = {"type": "object", "required": ["n"], "additionalProperties": False,
          "properties": {"n": {"type": "integer"}, "tags": {"type": "array", "maxItems": 2,
                                                          "items": {"type": "string", "enum": ["a", "b"]}}}}


class SchemaTests(unittest.TestCase):
    def test_valid(self):
        validate({"n": 1, "tags": ["a"]}, SCHEMA)

    def test_missing_required(self):
        with self.assertRaises(SchemaError):
            validate({}, SCHEMA)

    def test_extra_field(self):
        with self.assertRaises(SchemaError):
            validate({"n": 1, "x": 2}, SCHEMA)

    def test_bool_is_not_integer(self):
        with self.assertRaises(SchemaError):
            validate({"n": True}, SCHEMA)

    def test_enum_and_max_items(self):
        with self.assertRaises(SchemaError):
            validate({"n": 1, "tags": ["z"]}, SCHEMA)
        with self.assertRaises(SchemaError):
            validate({"n": 1, "tags": ["a", "b", "a"]}, SCHEMA)


if __name__ == "__main__":
    unittest.main()
