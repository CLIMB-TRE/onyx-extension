import React, { useState, useEffect } from "react";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
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
        .httpPathHandler("profile/")
        .then((response) => response.json())
        .then((data) => {console.log(data);
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

function status(s: string):string {
  switch (s) {
    case 'US': {
      return "Unstarted";
    }
    case 'MD': {
      return "Awaiting metadata checks";
    }
    case 'VD': {
      return "Awaiting validation Checks";
    }
    case 'FM': {
      return "Metadata checks failed";
    }
    case 'FV': {
      return "Validation checks fail";
    }
    case 'SU': {
      return "Success";
    }
    default: {
      return "Unknown";
    }
  }
} 


function bool_icon(b: boolean):string {
  if(b) {return '\u2713';}
  else {return '\u2717'};
}


const ResultsTable = function ResultsTable({
  data,
  titles,
  s3PathHandler,
}: {
  data: IngestionItem[];
  titles?: Map<string, string>;
  s3PathHandler?: (path: string) => void;
}) {


  return (
    <Table striped bordered hover responsive size="sm">
      <thead>
        <tr>
          <th key={"project"} title={"project"}> Project</th>
          <th key={"platform"} title={"platform"}> Platform</th>
          <th key={"site"} title={"site"}>Site </th>
          <th key={"status"} title={"status"}>Status </th>
          <th key={"is_published"} title={"is_published"}>Published </th>
          <th key={"is_test_attempt"} title={"is_test_attempt"}>Test Attempt</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
              <td key={"project"}>{row.fields.project}</td>
              <td key={"platform"}>{row.fields.platform}</td>
              <td key={"site"}>{row.fields.site}</td>
              <td key={"status"}>{status(row.fields.status)}</td>
              <td key={"is_published"}>{bool_icon(row.fields.is_published)}</td>
              <td key={"is_test_attempt"}>{bool_icon(row.fields.is_test_attempt)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};


//type ResultData = {
//  data?: Record<string, string | number | boolean | null>[];
//};

interface AgateProps {
  httpPathHandler: (path: string) => Promise<Response>;
  s3PathHandler?: (path: string) => void;
  fileWriter?: (path: string, content: string) => void;
  extVersion?: string;
}

interface DataProps extends AgateProps {
  project: string;
  darkMode: boolean;
}

interface SearchProps extends DataProps {
  handleSearch: () => void;
}

interface ResultsProps extends SearchProps {
  resultError: Error | null;
  resultData?: IngestionItem[];
  titles: Map<string,string>
}


interface IngestionItem {
  fields: IngestionFields
}

interface IngestionFields {
  uuid:string;
  project:string;
  platform:string;
  site:string;
  run_index:string;
  run_id:string;
  is_published:boolean;
  is_test_attempt:boolean;
  climb_id:string;
  error_message:string;
  status:string;
}


function Results(props: ResultsProps) {

  const handleExportToCSV = () => {
    props.handleSearch()
  };

  useEffect(() => {
        //Implementing the setInterval method
        const interval = setInterval(() => {
          props.handleSearch();
        }, 10000);
 
        //Clearing the interval
        return () => clearInterval(interval);
    });

  return (
    <Card>
      <Card.Header>
        <span>Ingestion</span>
        <Button
          className="float-end"
          size="sm"
          variant="success"
          onClick={handleExportToCSV}
        >
          Refresh
        </Button>
      </Card.Header>
      <Container fluid className="table-panel p-2">
        {props.resultError ? (
          <Alert variant="danger">Error: {props.resultError.message}</Alert>
        ) : (
          <ResultsTable
            data={props.resultData || []}
            titles={props.titles}
            s3PathHandler={props.s3PathHandler}
          />
        )}
      </Container>
      <Card.Footer>
      </Card.Footer>
    </Card>
  );
}

function Data(props: DataProps) {

  const titles = new Map<string,string>()
  titles.set("a","b")


  // Fetch data, depending on project and search parameters
  const {
    error: resultError,
    data: resultData,
    refetch: refetchResults,
  } = useQuery({
    queryKey: ["results", props.project],
    queryFn: async () => {
      return props
        .httpPathHandler(`ingestion/${props.project}/`)
        .then((response) => response.json())
        .then((string) => JSON.parse(string));
    },
    enabled: !!props.project,
  });

  const handleSearch = () => {
    // If search parameters have not changed, a refetch can be triggered
    // But only if the previous fetch has completed
      refetchResults();
  };

  return (
    <Container fluid className="g-2">
      <Stack gap={2}>
        <Results
          {...props}
          handleSearch={handleSearch}
          resultError={resultError instanceof Error ? resultError : null}
          resultData={resultData}
          titles= {titles}
        />
      </Stack>
    </Container>
  );
}

function App(props: AgateProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [project, setProject] = useState("");

  // Fetch the project list
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return props
        .httpPathHandler("projects/")
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
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

  const toggleTheme = () => {
    const htmlElement = document.querySelector("html");
    htmlElement?.setAttribute("data-bs-theme", !darkMode ? "dark" : "light");
    setDarkMode(!darkMode);
  };


  return (
    <Stack gap={2} className="Agate">
    <Header
      {...props}
      projectName={project}
      projectList={projects}
      handleProjectChange={setProject}
      handleThemeChange={toggleTheme}
      guiVersion={VERSION}
    />
      <Data
        {...props}
        project={project}
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
