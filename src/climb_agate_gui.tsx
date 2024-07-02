import React, { useState, useLayoutEffect, useEffect } from "react";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Pagination from "react-bootstrap/Pagination";
import { mkConfig, generateCsv, download, asString } from "export-to-csv";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Spinner } from "react-bootstrap";
import Table from "react-bootstrap/Table";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";

let VERSION = "0.0.1"

function HeaderText({ label, value }: { label: string; value: string }) {
  return (
    <Navbar.Text>
      {label}: <span className="text-light">{value || "None"}</span>
    </Navbar.Text>
  );
}

function HeaderVersion({
  label,
  version,
}: {
  label: string;
  version?: string;
}) {
  return (
    <Navbar.Text>
      {label}:{" "}
      {version ? (
        <code className="text-success">{`v${version}`}</code>
      ) : (
        <span className="text-light">None</span>
      )}
    </Navbar.Text>
  );
}

interface HeaderProps {
  httpPathHandler: (path: string) => Promise<Response>;
  projectName: string;
  projectList: string[];
  handleProjectChange: (p: string) => void;
  handleThemeChange: () => void;
  guiVersion?: string;
  extVersion?: string;
}

function Header(props: HeaderProps) {
  // Fetch user profile
  const { data: { username, site } = { username: "", site: "" } } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      return props
        .httpPathHandler("accounts/profile")
        .then((response) => response.json())
        .then((data) => {
          return { username: data.data.username, site: data.data.site };
        });
    },
  });

  return (
    <Navbar bg="dark" variant="dark" collapseOnSelect expand="sm">
      <Container fluid>
        <Navbar.Brand>Agate</Navbar.Brand>
        <Navbar.Collapse id="responsive-navbar-nav">
          <Stack direction="horizontal" gap={3}>
            <NavDropdown
              title={<HeaderText label="Project" value={props.projectName} />}
              id="collapsible-nav-dropdown"
              style={{ color: "white" }}
            >
              {props.projectList.map((p) => (
                <NavDropdown.Item
                  key={p}
                  onClick={() => props.handleProjectChange(p)}
                >
                  {p}
                </NavDropdown.Item>
              ))}
            </NavDropdown>
            <HeaderText label="User" value={username} />
            <HeaderText label="Site" value={site} />
            <HeaderVersion label="GUI" version={props.guiVersion} />
            <HeaderVersion label="Extension" version={props.extVersion} />
          </Stack>
        </Navbar.Collapse>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Form.Check
          type="switch"
          id="theme-switch"
          label={<span className="text-light">Switch Theme</span>}
          onChange={props.handleThemeChange}
        />
      </Container>
    </Navbar>
  );
}


const ResultsTable = function ResultsTable({
  data,
  titles,
  s3PathHandler,
}: {
  data: Record<string, string | number | boolean | null>[];
  titles?: Map<string, string>;
  s3PathHandler?: (path: string) => void;
}) {
  const headers = () => {
    if (data.length > 0) {
      return Object.keys(data[0]);
    } else {
      return [];
    }
  };

  const rows = data.map((item) =>
    Object.values(item).map((value) => value?.toString().trim() || "")
  );

  return (
    <Table striped bordered hover responsive size="sm">
      <thead>
        <tr>
          {headers().map((header) => (
            <th key={header} title={titles?.get(header)}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, index) =>
              s3PathHandler &&
              cell.startsWith("s3://") &&
              cell.endsWith(".html") ? (
                <td key={index}>
                  <Button variant="link" onClick={() => s3PathHandler(cell)}>
                    {cell}
                  </Button>
                </td>
              ) : (
                <td key={index}>{cell}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

function LoadingAlert() {
  return (
    <Alert variant="light">
      <Stack direction="horizontal" gap={2}>
        <Spinner />
        <span>Loading...</span>
      </Stack>
    </Alert>
  );
}

type ProjectField = {
  type: string;
  description: string;
  actions: string[];
  values?: string[];
  fields?: Record<string, ProjectField>;
};

type FilterField = {
  field: string;
  lookup: string;
  value: string;
};

type ResultData = {
  next?: string;
  previous?: string;
  data?: Record<string, string | number | boolean | null>[];
  messages?: Record<string, string | string[]>;
};

interface AgateProps {
  httpPathHandler: (path: string) => Promise<Response>;
  s3PathHandler?: (path: string) => void;
  fileWriter?: (path: string, content: string) => void;
  extVersion?: string;
}

interface DataProps extends AgateProps {
  project: string;
  projectFields: Map<string, ProjectField>;
  typeLookups: Map<string, string[]>;
  fieldDescriptions: Map<string, string>;
  lookupDescriptions: Map<string, string>;
  darkMode: boolean;
}

interface SearchProps extends DataProps {
  handleSearch: (params: string) => void;
}

interface ResultsProps extends SearchProps {
  resultPending: boolean;
  resultError: Error | null;
  resultData: ResultData;
}

function Parameters(props: SearchProps) {
  const [filterList, setFilterList] = useState(new Array<FilterField>());
  const [summariseList, setSummariseList] = useState(new Array<string>());
  const [includeList, setIncludeList] = useState(new Array<string>());
  const [excludeList, setExcludeList] = useState(new Array<string>());
  const [searchInput, setSearchInput] = useState("");
  const filterFieldOptions = Array.from(props.projectFields.entries())
    .filter(([, field]) => field.actions.includes("filter"))
    .map(([field]) => field);
  const listFieldOptions = Array.from(props.projectFields.entries())
    .filter(([, field]) => field.actions.includes("list"))
    .map(([field]) => field);

  // Clear parameters when project changes
  useLayoutEffect(() => {
    setFilterList([]);
    setSummariseList([]);
    setIncludeList([]);
    setExcludeList([]);
    setSearchInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.project]);


  const handleFilterAdd = (index: number) => {
    setFilterList([
      ...filterList.slice(0, index),
      { field: "", lookup: "", value: "" },
      ...filterList.slice(index),
    ]);
  };


  const handleFilterClear = () => {
    setFilterList([]);
  };

  const handleSummariseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSummariseList(e.target.value ? e.target.value.split(",") : []);
    setIncludeList([]);
    setExcludeList([]);
  };

  const handleIncludeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSummariseList([]);
    setIncludeList(e.target.value ? e.target.value.split(",") : []);
  };

  const handleExcludeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSummariseList([]);
    setExcludeList(e.target.value ? e.target.value.split(",") : []);
  };

  const handleParameters = () => {
    const params = new URLSearchParams(
      filterList
        .filter((filter) => filter.field)
        .map((filter) => {
          if (filter.lookup) {
            return [filter.field + "__" + filter.lookup, filter.value];
          } else {
            return [filter.field, filter.value];
          }
        })
        .concat(
          includeList
            .filter((include) => include)
            .map((field) => ["include", field])
        )
        .concat(
          excludeList
            .filter((exclude) => exclude)
            .map((field) => ["exclude", field])
        )
        .concat(
          summariseList
            .filter((summarise) => summarise)
            .map((field) => ["summarise", field])
        )
        .concat(
          [searchInput]
            .filter((search) => search)
            .map((search) => ["search", search])
        )
    );
    props.handleSearch(params.toString());
  };

  return (
    <>
      <Stack direction="horizontal" gap={2}>
        <Form.Control
          value={searchInput}
          placeholder="Search records..."
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyUp={(event) => {
            if (event.key === "Enter") {
              handleParameters();
            }
          }}
        />
        <Button
          variant="primary"
          disabled={!props.project}
          onClick={handleParameters}
        >
          Search
        </Button>
      </Stack>
      <Row className="g-2">
        <Col xl={6}>
          <Card>
            <Card.Header>
              <span>Filter</span>
              <Stack direction="horizontal" gap={1} className="float-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleFilterAdd(filterList.length)}
                >
                  Add Filter
                </Button>
                <Button size="sm" variant="danger" onClick={handleFilterClear}>
                  Clear Filters
                </Button>
              </Stack>
            </Card.Header>
            <Container fluid className="panel p-2">
              <Stack gap={1}>
              </Stack>
            </Container>
          </Card>
        </Col>
        {[
          {
            title: "Summarise",
            options: filterFieldOptions,
            value: summariseList,
            onChange: handleSummariseChange,
          },
          {
            title: "Include",
            options: listFieldOptions,
            value: includeList,
            onChange: handleIncludeChange,
          },
          {
            title: "Exclude",
            options: listFieldOptions,
            value: excludeList,
            onChange: handleExcludeChange,
          },
        ].map(({ title, options, value, onChange }) => (
          <Col key={title} md={4} xl={2}>
            <Card>
              <Card.Header>{title}</Card.Header>
              <Container fluid className="panel p-2">
              </Container>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

function Results(props: ResultsProps) {
  const csvConfig = mkConfig({
    filename: props.project,
    useKeysAsHeaders: true,
  });

  const handleExportToCSV = () => {
    const csv = generateCsv(csvConfig)(props.resultData.data || []);

    if (props.fileWriter) {
      props.fileWriter(props.project + ".csv", asString(csv));
    } else {
      download(csvConfig)(csv);
    }
  };

  return (
    <Card>
      <Card.Header>
        <span>Results</span>
        <Button
          className="float-end"
          size="sm"
          variant="success"
          onClick={handleExportToCSV}
        >
          Export Page to CSV
        </Button>
      </Card.Header>
      <Container fluid className="table-panel p-2">
        {props.resultPending ? (
          <LoadingAlert />
        ) : props.resultError ? (
          <Alert variant="danger">Error: {props.resultError.message}</Alert>
        ) : props.resultData.messages ? (
          Object.entries(props.resultData.messages).map(([key, value]) =>
            Array.isArray(value) ? (
              value.map((v: string) => (
                <Alert key={key} variant="danger">
                  {key}: {v}
                </Alert>
              ))
            ) : (
              <Alert key={key} variant="danger">
                {key}: {value}
              </Alert>
            )
          )
        ) : (
          <ResultsTable
            data={props.resultData.data || []}
            titles={props.fieldDescriptions}
            s3PathHandler={props.s3PathHandler}
          />
        )}
      </Container>
      <Card.Footer>
        <Pagination size="sm">
          <Pagination.Prev
            disabled={!props.resultData.previous}
            onClick={() => {
              props.handleSearch(
                props.resultData.previous?.split("?", 2)[1] || ""
              );
            }}
          />
          <Pagination.Item>
            {props.resultPending
              ? "Loading..."
              : `Showing ${props.resultData.data?.length || 0} results`}
          </Pagination.Item>
          <Pagination.Next
            disabled={!props.resultData.next}
            onClick={() => {
              props.handleSearch(
                props.resultData?.next?.split("?", 2)[1] || ""
              );
            }}
          />
        </Pagination>
      </Card.Footer>
    </Card>
  );
}

function Data(props: DataProps) {
  const [searchParameters, setSearchParameters] = useState("");

  // Clear parameters when project changes
  useLayoutEffect(() => {
    setSearchParameters("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.project]);

  // Fetch data, depending on project and search parameters
  const {
    isFetching: resultPending,
    error: resultError,
    data: resultData = {},
    refetch: refetchResults,
  } = useQuery({
    queryKey: ["results", props.project, searchParameters],
    queryFn: async () => {
      return props
        .httpPathHandler(`projects/${props.project}/?${searchParameters}`)
        .then((response) => response.json());
    },
    enabled: !!props.project,
  });

  const handleSearch = (search: string) => {
    // If search parameters have not changed, a refetch can be triggered
    // But only if the previous fetch has completed
    if (searchParameters === search && !resultPending) {
      refetchResults();
    }
    // Otherwise, set the new search parameters
    // This will trigger a new fetch
    setSearchParameters(search);
  };

  return (
    <Container fluid className="g-2">
      <Stack gap={2}>
        <Parameters {...props} handleSearch={handleSearch} />
        <Results
          {...props}
          handleSearch={setSearchParameters}
          resultPending={resultPending}
          resultError={resultError instanceof Error ? resultError : null}
          resultData={resultData}
        />
      </Stack>
    </Container>
  );
}

function flattenFields(fields: Record<string, ProjectField>) {
  const flatFields: Record<string, ProjectField> = {};

  // Loop over object and flatten nested fields
  const flatten = (obj: Record<string, ProjectField>, prefix = "") => {
    for (const [field, fieldInfo] of Object.entries(obj)) {
      flatFields[prefix + field] = fieldInfo;
      if (fieldInfo.type === "relation") {
        flatten(
          fieldInfo.fields as Record<string, ProjectField>,
          prefix + field + "__"
        );
      }
    }
  };

  flatten(fields);
  return flatFields;
}

function App(props: AgateProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [project, setProject] = useState("");

  // Fetch the project list
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return props
        .httpPathHandler("projects")
        .then((response) => response.json())
        .then((data) => {
          return [
            ...new Set(
              data.data.map(
                (project: Record<string, unknown>) => project.project
              )
            ),
          ] as string[];
        });
    },
  });

  // Set the first project as the default
  useEffect(() => {
    if (!project && projects) {
      setProject(projects[0]);
    }
  }, [project, projects]);

  // Fetch types and their lookups
  const { data: typeLookups = new Map<string, string[]>() } = useQuery({
    queryKey: ["types"],
    queryFn: async () => {
      return props
        .httpPathHandler("projects/types")
        .then((response) => response.json())
        .then((data) => {
          return new Map(
            data.data.map((type: Record<string, unknown>) => [
              type.type,
              type.lookups,
            ])
          ) as Map<string, string[]>;
        });
    },
  });

  // Fetch lookup descriptions
  const { data: lookupDescriptions = new Map<string, string>() } = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => {
      return props
        .httpPathHandler("projects/lookups")
        .then((response) => response.json())
        .then((data) => {
          return new Map(
            data.data.map((lookup: Record<string, unknown>) => [
              lookup.lookup,
              lookup.description,
            ])
          ) as Map<string, string>;
        });
    },
  });

  // Fetch project information

  const {
    data: { projectName, projectFields, fieldDescriptions } = {
      projectName: "",
      projectFields: new Map<string, ProjectField>(),
      fieldDescriptions: new Map<string, string>(),
    },
  } = useQuery({
    queryKey: ["fields", project],
    queryFn: async () => {
      return props
        .httpPathHandler("projects/" + project + "/fields")
        .then((response) => response.json())
        .then((data) => {
          const fields = flattenFields(data.data.fields);
          const projectName = data.data.name;
          const projectFields = new Map(
            Object.keys(fields).map((field) => [
              field,
              {
                type: fields[field].type,
                description: fields[field].description,
                actions: fields[field].actions,
                values: fields[field].values,
              },
            ])
          );
          const fieldDescriptions = new Map(
            Array.from(projectFields.entries()).map(([field, options]) => [
              field,
              options.description,
            ])
          );
          return { projectName, projectFields, fieldDescriptions };
        });
    },
    enabled: !!project,
  });

  const toggleTheme = () => {
    const htmlElement = document.querySelector("html");
    htmlElement?.setAttribute("data-bs-theme", !darkMode ? "dark" : "light");
    setDarkMode(!darkMode);
  };


  return (
    <Stack gap={2} className="Agate">
    <Header
      {...props}
      projectName={projectName}
      projectList={projects}
      handleProjectChange={setProject}
      handleThemeChange={toggleTheme}
      guiVersion={VERSION}
    />
      <Data
        {...props}
        project={project}
        projectFields={projectFields}
        typeLookups={typeLookups}
        fieldDescriptions={fieldDescriptions}
        lookupDescriptions={lookupDescriptions}
        darkMode={darkMode}
      />
      <div></div>
    </Stack>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function Agate(props: AgateProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <App {...props} />
    </QueryClientProvider>
  );
}

export default Agate;
