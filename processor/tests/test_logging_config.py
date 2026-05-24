import logging

from processor.src.logging_config import ExtraFieldsFormatter


def test_extra_fields_formatter_renders_structured_fields():
    formatter = ExtraFieldsFormatter("%(message)s")
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="event_key",
        args=(),
        exc_info=None,
    )
    record.event_id = "event-1"
    record.operation = "publish_alert"

    line = formatter.format(record)

    assert line.startswith("event_key fields=")
    assert '"event_id": "event-1"' in line
    assert '"operation": "publish_alert"' in line
